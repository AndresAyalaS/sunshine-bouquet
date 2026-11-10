namespace SunshineBouquet.Domain.Orders;

/// <summary>Estados logísticos de una orden de exportación.</summary>
public enum OrderStatus
{
    Created = 0,
    InTransit = 1,
    Delivered = 2,
    Cancelled = 3
}
