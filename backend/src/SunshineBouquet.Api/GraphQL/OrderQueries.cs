using SunshineBouquet.Application.Orders;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Api.GraphQL;

public sealed class OrderQueries
{
    /// <summary>Lista órdenes, de la más reciente a la más antigua. Opcionalmente filtra por estado.</summary>
    public Task<IReadOnlyList<Order>> GetOrders(
        OrderStatus? status,
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.ListAsync(status, ct);

    /// <summary>Detalle de una orden; null si no existe.</summary>
    public Task<Order?> GetOrder(
        Guid id,
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.GetByIdAsync(id, ct);

    /// <summary>Totales para el dashboard.</summary>
    public Task<OrderStats> GetOrderStats(
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.GetStatsAsync(ct);
}
