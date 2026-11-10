using SunshineBouquet.Application.Orders;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Api.GraphQL;

public sealed record CreateOrderInput(
    string CustomerStore,
    string OriginCountry,
    string DestinationCity,
    int BouquetQuantity);

public sealed class OrderMutations
{
    public Task<Order?> CreateOrder(
        CreateOrderInput input,
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.CreateAsync(
            new CreateOrderCommand(
                input.CustomerStore,
                input.OriginCountry,
                input.DestinationCity,
                input.BouquetQuantity),
            ct);

    /// <summary>Permitido: CREATED→IN_TRANSIT, IN_TRANSIT→DELIVERED, CREATED→CANCELLED.</summary>
    public Task<Order?> UpdateOrderStatus(
        Guid id,
        OrderStatus status,
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.ChangeStatusAsync(id, status, ct);

    /// <summary>Asigna la orden a una tienda cliente (solo órdenes CREATED).</summary>
    public Task<Order?> AssignOrderToStore(
        Guid id,
        string customerStore,
        [Service] IOrderService service,
        CancellationToken ct) =>
        service.AssignToStoreAsync(id, customerStore, ct);
}
