namespace SunshineBouquet.Domain.Common;

/// <summary>Violación de una regla de negocio. <see cref="Code"/> es estable y apto para clientes.</summary>
public class DomainException : Exception
{
    public string Code { get; }

    public DomainException(string code, string message) : base(message)
    {
        Code = code;
    }
}
