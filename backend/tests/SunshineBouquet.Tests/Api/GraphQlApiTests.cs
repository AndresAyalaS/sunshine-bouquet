using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SunshineBouquet.Infrastructure.Persistence;

namespace SunshineBouquet.Tests.Api;

/// <summary>Prueba end-to-end del esquema GraphQL real, con EF Core InMemory en lugar de SQL Server.</summary>
public class GraphQlApiTests : IClassFixture<GraphQlApiTests.ApiFactory>
{
    private readonly HttpClient _client;

    public GraphQlApiTests(ApiFactory factory) => _client = factory.CreateClient();

    public sealed class ApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _dbName = $"tests-{Guid.NewGuid()}";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("ConnectionStrings:Default", "Server=unused");
            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)).ToList();
                foreach (var d in descriptors) services.Remove(d);

                services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_dbName));
            });
        }
    }

    private async Task<JsonElement> PostAsync(string query, object? variables = null)
    {
        var response = await _client.PostAsJsonAsync("/graphql", new { query, variables });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    private async Task<string> CreateOrderAsync(string store = "Flower Shop NYC", int qty = 120)
    {
        var result = await PostAsync(
            """
            mutation($i: CreateOrderInput!) { createOrder(input: $i) { id status } }
            """,
            new { i = new { customerStore = store, originCountry = "Colombia", destinationCity = "Miami", bouquetQuantity = qty } });

        return result.GetProperty("data").GetProperty("createOrder").GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task CreateOrder_ThenQueryById_ReturnsCreatedOrder()
    {
        var id = await CreateOrderAsync("Tulip Corner", 75);

        var result = await PostAsync(
            "query($id: UUID!) { order(id: $id) { id customerStore bouquetQuantity status createdAt } }",
            new { id });

        var order = result.GetProperty("data").GetProperty("order");
        Assert.Equal("Tulip Corner", order.GetProperty("customerStore").GetString());
        Assert.Equal(75, order.GetProperty("bouquetQuantity").GetInt32());
        Assert.Equal("CREATED", order.GetProperty("status").GetString());
    }

    [Fact]
    public async Task UpdateStatus_HappyPath_AndInvalidTransitionReturnsErrorCode()
    {
        var id = await CreateOrderAsync();
        const string mutation = "mutation($id: UUID!, $s: OrderStatus!) { updateOrderStatus(id: $id, status: $s) { status } }";

        var ok = await PostAsync(mutation, new { id, s = "IN_TRANSIT" });
        Assert.Equal("IN_TRANSIT", ok.GetProperty("data").GetProperty("updateOrderStatus").GetProperty("status").GetString());

        var bad = await PostAsync(mutation, new { id, s = "CANCELLED" });
        var error = bad.GetProperty("errors")[0];
        Assert.Equal("INVALID_STATUS_TRANSITION", error.GetProperty("extensions").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Orders_FilterByStatus_AndStats()
    {
        var id = await CreateOrderAsync();
        await PostAsync(
            "mutation($id: UUID!) { updateOrderStatus(id: $id, status: CANCELLED) { id } }",
            new { id });

        var cancelled = await PostAsync("{ orders(status: CANCELLED) { id status } }");
        Assert.All(
            cancelled.GetProperty("data").GetProperty("orders").EnumerateArray(),
            o => Assert.Equal("CANCELLED", o.GetProperty("status").GetString()));

        var stats = await PostAsync("{ orderStats { total byStatus { status count } } }");
        var data = stats.GetProperty("data").GetProperty("orderStats");
        Assert.True(data.GetProperty("total").GetInt32() >= 1);
        Assert.Equal(4, data.GetProperty("byStatus").GetArrayLength());
    }

    [Fact]
    public async Task UpdateStatus_UnknownOrder_ReturnsNotFoundCode()
    {
        var result = await PostAsync(
            "mutation($id: UUID!) { updateOrderStatus(id: $id, status: IN_TRANSIT) { id } }",
            new { id = Guid.NewGuid() });

        Assert.Equal(
            "ORDER_NOT_FOUND",
            result.GetProperty("errors")[0].GetProperty("extensions").GetProperty("code").GetString());
    }

    [Fact]
    public async Task CreateOrder_InvalidQuantity_ReturnsValidationCode()
    {
        var result = await PostAsync(
            """
            mutation { createOrder(input: { customerStore: "X", originCountry: "CO", destinationCity: "MIA", bouquetQuantity: 0 }) { id } }
            """);

        Assert.Equal(
            "INVALID_QUANTITY",
            result.GetProperty("errors")[0].GetProperty("extensions").GetProperty("code").GetString());
    }
}
