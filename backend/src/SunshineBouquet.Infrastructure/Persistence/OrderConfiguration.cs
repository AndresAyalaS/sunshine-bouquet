using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SunshineBouquet.Domain.Orders;

namespace SunshineBouquet.Infrastructure.Persistence;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).ValueGeneratedNever();

        builder.Property(o => o.CustomerStore).HasMaxLength(Order.MaxTextLength).IsRequired();
        builder.Property(o => o.OriginCountry).HasMaxLength(Order.MaxTextLength).IsRequired();
        builder.Property(o => o.DestinationCity).HasMaxLength(Order.MaxTextLength).IsRequired();
        builder.Property(o => o.BouquetQuantity).IsRequired();

        // Se guarda como texto ("IN_TRANSIT" no, "InTransit"): legible en SQL y seguro ante reordenar el enum.
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(o => o.CreatedAt).IsRequired();

        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.CreatedAt);
    }
}
