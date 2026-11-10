using Microsoft.EntityFrameworkCore;
using SunshineBouquet.Api.GraphQL;
using SunshineBouquet.Application;
using SunshineBouquet.Infrastructure;
using SunshineBouquet.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Default.");

builder.Services
    .AddApplication()
    .AddInfrastructure(connectionString);

builder.Services
    .AddGraphQLServer()
    .AddApolloFederation() // expone _service { sdl } para que Apollo Gateway componga el supergrafo
    .AddQueryType<OrderQueries>()
    .AddMutationType<OrderMutations>()
    .AddType<OrderType>()
    .AddErrorFilter<DomainErrorFilter>();

var app = builder.Build();

await ApplyMigrationsAsync(app);

app.MapGraphQL(); // /graphql
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

static async Task ApplyMigrationsAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (!db.Database.IsRelational())
    {
        return; // InMemory (tests)
    }

    // SQL Server en Docker tarda en aceptar conexiones: reintentamos unos segundos.
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await db.Database.MigrateAsync();
            return;
        }
        catch (Exception ex) when (attempt < 10)
        {
            app.Logger.LogWarning(ex, "BD no disponible (intento {Attempt}/10). Reintentando...", attempt);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }
}

// Necesario para WebApplicationFactory<Program> en tests de integración.
public partial class Program;
