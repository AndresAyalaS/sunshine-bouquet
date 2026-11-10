using Microsoft.EntityFrameworkCore;
using SunshineBouquet.Application.Orders;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Infrastructure.Persistence;

internal sealed class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public async Task AddAsync(Order order, CancellationToken ct) =>
        await db.Orders.AddAsync(order, ct);

    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<IReadOnlyList<Order>> ListAsync(OrderStatus? status, CancellationToken ct)
    {
        var query = db.Orders.AsNoTracking();

        if (status is not null)
        {
            query = query.Where(o => o.Status == status);
        }

        return await query.OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyDictionary<OrderStatus, int>> CountByStatusAsync(CancellationToken ct)
    {
        var rows = await db.Orders
            .AsNoTracking()
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.Status, r => r.Count);
    }

    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
