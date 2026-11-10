using SunshineBouquet.Domain.Common;

namespace SunshineBouquet.Domain.Orders;

/// <summary>
/// Aggregate root. Todas las reglas (validación y transiciones de estado) viven aquí;
/// las capas externas no pueden dejar una orden en un estado inválido.
/// </summary>
public sealed class Order
{
    public const int MaxTextLength = 100;
    public const int MaxBouquetQuantity = 100_000;

    private static readonly IReadOnlyDictionary<OrderStatus, OrderStatus[]> AllowedTransitions =
        new Dictionary<OrderStatus, OrderStatus[]>
        {
            [OrderStatus.Created] = [OrderStatus.InTransit, OrderStatus.Cancelled],
            [OrderStatus.InTransit] = [OrderStatus.Delivered],
            [OrderStatus.Delivered] = [],
            [OrderStatus.Cancelled] = []
        };

    // Requerido por EF Core.
    private Order() { }

    public Guid Id { get; private set; }
    public string CustomerStore { get; private set; } = string.Empty;
    public string OriginCountry { get; private set; } = string.Empty;
    public string DestinationCity { get; private set; } = string.Empty;
    public int BouquetQuantity { get; private set; }
    public OrderStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static Order Create(
        string customerStore,
        string originCountry,
        string destinationCity,
        int bouquetQuantity,
        DateTimeOffset createdAt)
    {
        if (bouquetQuantity is < 1 or > MaxBouquetQuantity)
        {
            throw new DomainException(
                "INVALID_QUANTITY",
                $"La cantidad de ramos debe estar entre 1 y {MaxBouquetQuantity}.");
        }

        return new Order
        {
            Id = Guid.NewGuid(),
            CustomerStore = NormalizeText(customerStore, "tienda cliente"),
            OriginCountry = NormalizeText(originCountry, "país de origen"),
            DestinationCity = NormalizeText(destinationCity, "ciudad de destino"),
            BouquetQuantity = bouquetQuantity,
            Status = OrderStatus.Created,
            CreatedAt = createdAt
        };
    }

    public bool CanTransitionTo(OrderStatus target) =>
        AllowedTransitions[Status].Contains(target);

    public void ChangeStatus(OrderStatus target)
    {
        if (!CanTransitionTo(target))
        {
            throw new DomainException(
                "INVALID_STATUS_TRANSITION",
                $"No se puede pasar de {Status} a {target}.");
        }

        Status = target;
    }

    /// <summary>Asigna (o reasigna) la orden a una tienda cliente. Solo mientras esté CREATED.</summary>
    public void AssignToStore(string customerStore)
    {
        if (Status != OrderStatus.Created)
        {
            throw new DomainException(
                "ORDER_NOT_EDITABLE",
                $"Solo se puede reasignar una orden en estado {OrderStatus.Created}; la orden está {Status}.");
        }

        CustomerStore = NormalizeText(customerStore, "tienda cliente");
    }

    private static string NormalizeText(string? value, string fieldName)
    {
        var trimmed = value?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            throw new DomainException("REQUIRED_FIELD", $"El campo {fieldName} es obligatorio.");
        }

        if (trimmed.Length > MaxTextLength)
        {
            throw new DomainException(
                "FIELD_TOO_LONG",
                $"El campo {fieldName} no puede superar {MaxTextLength} caracteres.");
        }

        return trimmed;
    }
}
