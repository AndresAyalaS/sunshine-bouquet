using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SunshineBouquet.Application.Orders;
using SunshineBouquet.Infrastructure.Persistence;

namespace SunshineBouquet.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));

        services.AddScoped<IOrderRepository, EfOrderRepository>();
        return services;
    }
}
