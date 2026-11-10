using SunshineBouquet.Domain.Common;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Application.Orders;

public sealed record CreateOrderCommand(
    string CustomerStore,
    string OriginCountry,
    string DestinationCity,
    int BouquetQuantity);

public sealed record StatusCount(OrderStatus Status, int Count);

public sealed record OrderStats(int Total, IReadOnlyList<StatusCount> ByStatus);

public sealed class OrderNotFoundException(Guid id)
    : DomainException("ORDER_NOT_FOUND", $"No existe la orden {id}.");

public interface IOrderService
{
    Task<Order> CreateAsync(CreateOrderCommand command, CancellationToken ct);
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Order>> ListAsync(OrderStatus? status, CancellationToken ct);
    Task<Order> ChangeStatusAsync(Guid id, OrderStatus newStatus, CancellationToken ct);
    Task<Order> AssignToStoreAsync(Guid id, string customerStore, CancellationToken ct);
    Task<OrderStats> GetStatsAsync(CancellationToken ct);
}

/// <summary>Casos de uso. Orquesta repositorio y dominio; no contiene reglas de negocio propias.</summary>
public sealed class OrderService(IOrderRepository repository, TimeProvider clock) : IOrderService
{
    public async Task<Order> CreateAsync(CreateOrderCommand command, CancellationToken ct)
    {
        var order = Order.Create(
            command.CustomerStore,
            command.OriginCountry,
            command.DestinationCity,
            command.BouquetQuantity,
            clock.GetUtcNow());

        await repository.AddAsync(order, ct);
        await repository.SaveChangesAsync(ct);
        return order;
    }

    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
        repository.GetByIdAsync(id, ct);

    public Task<IReadOnlyList<Order>> ListAsync(OrderStatus? status, CancellationToken ct) =>
        repository.ListAsync(status, ct);

    public async Task<Order> ChangeStatusAsync(Guid id, OrderStatus newStatus, CancellationToken ct)
    {
        var order = await GetOrThrowAsync(id, ct);
        order.ChangeStatus(newStatus);
        await repository.SaveChangesAsync(ct);
        return order;
    }

    public async Task<Order> AssignToStoreAsync(Guid id, string customerStore, CancellationToken ct)
    {
        var order = await GetOrThrowAsync(id, ct);
        order.AssignToStore(customerStore);
        await repository.SaveChangesAsync(ct);
        return order;
    }

    public async Task<OrderStats> GetStatsAsync(CancellationToken ct)
    {
        var counts = await repository.CountByStatusAsync(ct);

        // Siempre devolvemos todos los estados (con 0) para que el dashboard no tenga que rellenar huecos.
        var byStatus = Enum.GetValues<OrderStatus>()
            .Select(s => new StatusCount(s, counts.GetValueOrDefault(s)))
            .ToList();

        return new OrderStats(byStatus.Sum(x => x.Count), byStatus);
    }

    private async Task<Order> GetOrThrowAsync(Guid id, CancellationToken ct) =>
        await repository.GetByIdAsync(id, ct) ?? throw new OrderNotFoundException(id);
}
