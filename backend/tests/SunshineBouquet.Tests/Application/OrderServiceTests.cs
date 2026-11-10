using SunshineBouquet.Application.Orders;
using SunshineBouquet.Domain.Common;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Tests.Application;

public class OrderServiceTests
{
    private readonly InMemoryOrderRepository _repo = new();
    private readonly FixedClock _clock = new(new DateTimeOffset(2026, 11, 9, 12, 0, 0, TimeSpan.Zero));
    private readonly OrderService _sut;

    public OrderServiceTests() => _sut = new OrderService(_repo, _clock);

    private static CreateOrderCommand Cmd(int qty = 100) => new("Flower Shop NYC", "Ecuador", "Miami", qty);

    [Fact]
    public async Task Create_PersistsOrder_WithClockTimestamp()
    {
        var order = await _sut.CreateAsync(Cmd(250), default);

        Assert.Equal(1, _repo.SaveCount);
        Assert.Same(order, await _repo.GetByIdAsync(order.Id, default));
        Assert.Equal(_clock.GetUtcNow(), order.CreatedAt);
        Assert.Equal(250, order.BouquetQuantity);
    }

    [Fact]
    public async Task Create_WithInvalidData_DoesNotPersist()
    {
        await Assert.ThrowsAsync<DomainException>(() => _sut.CreateAsync(Cmd(0), default));

        Assert.Equal(0, _repo.SaveCount);
        Assert.Empty(await _repo.ListAsync(null, default));
    }

    [Fact]
    public async Task ChangeStatus_FollowsHappyPath_AndSaves()
    {
        var order = await _sut.CreateAsync(Cmd(), default);

        await _sut.ChangeStatusAsync(order.Id, OrderStatus.InTransit, default);
        var delivered = await _sut.ChangeStatusAsync(order.Id, OrderStatus.Delivered, default);

        Assert.Equal(OrderStatus.Delivered, delivered.Status);
        Assert.Equal(3, _repo.SaveCount); // create + 2 cambios
    }

    [Fact]
    public async Task ChangeStatus_UnknownOrder_ThrowsNotFound()
    {
        var ex = await Assert.ThrowsAsync<OrderNotFoundException>(
            () => _sut.ChangeStatusAsync(Guid.NewGuid(), OrderStatus.InTransit, default));

        Assert.Equal("ORDER_NOT_FOUND", ex.Code);
    }

    [Fact]
    public async Task ChangeStatus_InvalidTransition_Throws_AndDoesNotSave()
    {
        var order = await _sut.CreateAsync(Cmd(), default);
        var savesBefore = _repo.SaveCount;

        await Assert.ThrowsAsync<DomainException>(
            () => _sut.ChangeStatusAsync(order.Id, OrderStatus.Delivered, default));

        Assert.Equal(savesBefore, _repo.SaveCount);
    }

    [Fact]
    public async Task List_FiltersByStatus()
    {
        var a = await _sut.CreateAsync(Cmd(), default);
        await _sut.CreateAsync(Cmd(), default);
        await _sut.ChangeStatusAsync(a.Id, OrderStatus.Cancelled, default);

        Assert.Equal(2, (await _sut.ListAsync(null, default)).Count);
        Assert.Single(await _sut.ListAsync(OrderStatus.Cancelled, default));
        Assert.Single(await _sut.ListAsync(OrderStatus.Created, default));
        Assert.Empty(await _sut.ListAsync(OrderStatus.Delivered, default));
    }

    [Fact]
    public async Task Stats_ReturnsAllStatuses_IncludingZeros()
    {
        var a = await _sut.CreateAsync(Cmd(), default);
        await _sut.CreateAsync(Cmd(), default);
        await _sut.ChangeStatusAsync(a.Id, OrderStatus.InTransit, default);

        var stats = await _sut.GetStatsAsync(default);

        Assert.Equal(2, stats.Total);
        Assert.Equal(4, stats.ByStatus.Count);
        Assert.Equal(1, stats.ByStatus.Single(s => s.Status == OrderStatus.Created).Count);
        Assert.Equal(1, stats.ByStatus.Single(s => s.Status == OrderStatus.InTransit).Count);
        Assert.Equal(0, stats.ByStatus.Single(s => s.Status == OrderStatus.Delivered).Count);
        Assert.Equal(0, stats.ByStatus.Single(s => s.Status == OrderStatus.Cancelled).Count);
    }

    [Fact]
    public async Task AssignToStore_UpdatesStore()
    {
        var order = await _sut.CreateAsync(Cmd(), default);

        var updated = await _sut.AssignToStoreAsync(order.Id, "Rose Garden LA", default);

        Assert.Equal("Rose Garden LA", updated.CustomerStore);
    }

    // --- dobles de prueba ---

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class InMemoryOrderRepository : IOrderRepository
    {
        private readonly List<Order> _orders = [];
        public int SaveCount { get; private set; }

        public Task AddAsync(Order order, CancellationToken ct)
        {
            _orders.Add(order);
            return Task.CompletedTask;
        }

        public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(_orders.FirstOrDefault(o => o.Id == id));

        public Task<IReadOnlyList<Order>> ListAsync(OrderStatus? status, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Order>>(
                _orders.Where(o => status is null || o.Status == status).ToList());

        public Task<IReadOnlyDictionary<OrderStatus, int>> CountByStatusAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyDictionary<OrderStatus, int>>(
                _orders.GroupBy(o => o.Status).ToDictionary(g => g.Key, g => g.Count()));

        public Task SaveChangesAsync(CancellationToken ct)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }
}
