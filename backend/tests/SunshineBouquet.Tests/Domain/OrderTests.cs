using SunshineBouquet.Domain.Common;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Tests.Domain;

public class OrderTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 9, 12, 0, 0, TimeSpan.Zero);

    private static Order NewOrder() => Order.Create("Flower Shop NYC", "Colombia", "Miami", 500, Now);

    private static Order InStatus(OrderStatus status)
    {
        var order = NewOrder();
        switch (status)
        {
            case OrderStatus.InTransit:
                order.ChangeStatus(OrderStatus.InTransit);
                break;
            case OrderStatus.Delivered:
                order.ChangeStatus(OrderStatus.InTransit);
                order.ChangeStatus(OrderStatus.Delivered);
                break;
            case OrderStatus.Cancelled:
                order.ChangeStatus(OrderStatus.Cancelled);
                break;
        }
        return order;
    }

    [Fact]
    public void Create_StartsAsCreated_WithTrimmedData()
    {
        var order = Order.Create("  Flower Shop NYC ", " Colombia", "Miami ", 10, Now);

        Assert.NotEqual(Guid.Empty, order.Id);
        Assert.Equal(OrderStatus.Created, order.Status);
        Assert.Equal("Flower Shop NYC", order.CustomerStore);
        Assert.Equal("Colombia", order.OriginCountry);
        Assert.Equal("Miami", order.DestinationCity);
        Assert.Equal(Now, order.CreatedAt);
    }

    [Theory]
    [InlineData("", "Colombia", "Miami", 1, "REQUIRED_FIELD")]
    [InlineData("Shop", "   ", "Miami", 1, "REQUIRED_FIELD")]
    [InlineData("Shop", "Colombia", "", 1, "REQUIRED_FIELD")]
    [InlineData("Shop", "Colombia", "Miami", 0, "INVALID_QUANTITY")]
    [InlineData("Shop", "Colombia", "Miami", -5, "INVALID_QUANTITY")]
    [InlineData("Shop", "Colombia", "Miami", 100_001, "INVALID_QUANTITY")]
    public void Create_WithInvalidData_Throws(string store, string origin, string city, int qty, string code)
    {
        var ex = Assert.Throws<DomainException>(() => Order.Create(store, origin, city, qty, Now));
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public void Create_WithTooLongText_Throws()
    {
        var ex = Assert.Throws<DomainException>(
            () => Order.Create(new string('x', Order.MaxTextLength + 1), "Colombia", "Miami", 1, Now));
        Assert.Equal("FIELD_TOO_LONG", ex.Code);
    }

    [Theory]
    [InlineData(OrderStatus.Created, OrderStatus.InTransit)]
    [InlineData(OrderStatus.InTransit, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Created, OrderStatus.Cancelled)]
    public void ChangeStatus_AllowedTransitions_Succeed(OrderStatus from, OrderStatus to)
    {
        var order = InStatus(from);

        order.ChangeStatus(to);

        Assert.Equal(to, order.Status);
    }

    [Theory]
    [InlineData(OrderStatus.Created, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Created, OrderStatus.Created)]
    [InlineData(OrderStatus.InTransit, OrderStatus.Created)]
    [InlineData(OrderStatus.InTransit, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Delivered, OrderStatus.InTransit)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Created)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.InTransit)]
    public void ChangeStatus_ForbiddenTransitions_Throw_AndKeepStatus(OrderStatus from, OrderStatus to)
    {
        var order = InStatus(from);

        var ex = Assert.Throws<DomainException>(() => order.ChangeStatus(to));

        Assert.Equal("INVALID_STATUS_TRANSITION", ex.Code);
        Assert.Equal(from, order.Status);
    }

    [Fact]
    public void AssignToStore_WhenCreated_ChangesStore()
    {
        var order = NewOrder();

        order.AssignToStore("  Rose Garden LA ");

        Assert.Equal("Rose Garden LA", order.CustomerStore);
    }

    [Theory]
    [InlineData(OrderStatus.InTransit)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled)]
    public void AssignToStore_WhenNotCreated_Throws(OrderStatus status)
    {
        var order = InStatus(status);

        var ex = Assert.Throws<DomainException>(() => order.AssignToStore("Other"));

        Assert.Equal("ORDER_NOT_EDITABLE", ex.Code);
        Assert.Equal("Flower Shop NYC", order.CustomerStore);
    }
}
