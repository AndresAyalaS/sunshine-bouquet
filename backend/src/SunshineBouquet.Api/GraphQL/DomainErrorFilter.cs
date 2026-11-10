using SunshineBouquet.Domain.Common;

namespace SunshineBouquet.Api.GraphQL;

/// <summary>
/// Traduce errores de negocio a errores GraphQL con código estable (extensions.code)
/// y evita filtrar detalles internos al cliente.
/// </summary>
public sealed class DomainErrorFilter : IErrorFilter
{
    public IError OnError(IError error) =>
        error.Exception is DomainException ex
            ? error.WithMessage(ex.Message).WithCode(ex.Code)
            : error;
}
