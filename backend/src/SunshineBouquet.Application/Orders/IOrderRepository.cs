using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Application.Orders;

/// <summary>Puerto de persistencia. La implementación vive en Infrastructure (DIP).</summary>
public interface IOrderRepository
{
    Task AddAsync(Order order, CancellationToken ct);
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Order>> ListAsync(OrderStatus? status, CancellationToken ct);
    Task<IReadOnlyDictionary<OrderStatus, int>> CountByStatusAsync(CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
