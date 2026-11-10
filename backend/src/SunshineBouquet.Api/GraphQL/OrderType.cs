
using HotChocolate.ApolloFederation;
using HotChocolate.ApolloFederation.Types;
using HotChocolate.Types;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Api.GraphQL;
public sealed class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor) =>
        descriptor.Key("id");
}

