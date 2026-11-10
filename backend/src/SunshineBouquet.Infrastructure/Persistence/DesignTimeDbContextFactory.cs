using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SunshineBouquet.Infrastructure.Persistence;

/// <summary>Permite correr `dotnet ef` sin levantar la API ni tener SQL Server disponible.</summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=SunshineBouquet;User Id=sa;Password=Design_Time_1;TrustServerCertificate=True")
            .Options;

        return new AppDbContext(options);
    }
}
