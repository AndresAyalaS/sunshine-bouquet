# Sunshine Bouquet – Gestión de Órdenes de Exportación (MVP)

MVP para gestionar órdenes de exportación de ramos de flores LATAM → USA.
Estado actual: **backend completo**; frontend (Angular) en la siguiente etapa.

## Arquitectura

```
Angular (próximo) ──► Apollo Gateway (Node, :4000) ──► API .NET 8 / HotChocolate (:5000) ──► SQL Server
                       supergrafo federado             subgrafo "orders"                       EF Core
```

Backend en capas (Clean Architecture, dependencias hacia adentro):

| Proyecto | Responsabilidad | Depende de |
|---|---|---|
| `Domain` | `Order` (aggregate root), `OrderStatus`, reglas y transiciones. Sin dependencias externas. | — |
| `Application` | Casos de uso (`OrderService`), puerto `IOrderRepository`. | Domain |
| `Infrastructure` | EF Core + SQL Server, repositorio, configuración de entidad. | Application |
| `Api` | Esquema GraphQL (HotChocolate), filtro de errores, `Program`. | Application, Infrastructure |

## Cómo ejecutar

### Todo con Docker
```bash
docker compose up --build
```
- Gateway GraphQL: http://localhost:4000/
- API (subgrafo): http://localhost:5000/graphql (Banana Cake Pop incluido)

### Sin Docker
```bash
# SQL Server local o en contenedor:
docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD=Your_strong_Passw0rd -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
cd backend && dotnet run --project src/SunshineBouquet.Api   # http://localhost:5000
cd gateway && npm install && npm start                        # http://localhost:4000
```

### Migraciones (primera vez)
La migración inicial se genera con:
```bash
scripts/add-migration.sh InitialCreate
```
La API aplica las migraciones automáticamente al iniciar (con reintentos mientras SQL Server arranca).

### Pruebas
```bash
cd backend && dotnet test
scripts/smoke-test.sh http://localhost:4000/   # con todo levantado
```

## API GraphQL

```graphql
type Query {
  orders(status: OrderStatus): [Order!]!
  order(id: UUID!): Order
  orderStats: OrderStats!
}
type Mutation {
  createOrder(input: CreateOrderInput!): Order!
  updateOrderStatus(id: UUID!, status: OrderStatus!): Order!
  assignOrderToStore(id: UUID!, customerStore: String!): Order!
}
enum OrderStatus { CREATED IN_TRANSIT DELIVERED CANCELLED }
```

Errores de negocio llegan con `extensions.code` estable: `ORDER_NOT_FOUND`, `INVALID_STATUS_TRANSITION`,
`INVALID_QUANTITY`, `REQUIRED_FIELD`, `FIELD_TOO_LONG`, `ORDER_NOT_EDITABLE`.

## Decisiones técnicas

- **Reglas en el dominio**: `Order` tiene constructor privado y fábrica `Create`; las transiciones permitidas
  (CREATED→IN_TRANSIT, IN_TRANSIT→DELIVERED, CREATED→CANCELLED) están en una tabla, no en `if` dispersos (OCP).
- **DIP**: `Application` define `IOrderRepository`; EF Core es un detalle de Infrastructure y se sustituye en tests.
- **Reloj inyectable** (`TimeProvider`) para tests deterministas.
- **Estado como texto en BD** (`HasConversion<string>`): legible y robusto ante reordenar el enum.
- **"Asignar a tienda cliente"** se modeló como `assignOrderToStore`, permitido solo en órdenes CREATED.
- **`orderStats`** devuelve siempre los 4 estados (con 0) para simplificar el dashboard.
- **Apollo Gateway + federación**: HotChocolate expone el subgrafo (`AddApolloFederation`) y el gateway lo compone con `IntrospectAndCompose`.
- **Tests**: unitarios de dominio y servicio (sin BD) + integración del esquema GraphQL real con EF InMemory.

## Mejoras futuras

- Concurrencia optimista (`rowversion`) al cambiar estado.
- Paginación (cursor) y filtros/orden en `orders`.
- Entidad `CustomerStore` propia (catálogo) en lugar de texto libre; historial de cambios de estado (auditoría).
- Autenticación/autorización, observabilidad (OpenTelemetry), supergrafo estático en CI en lugar de introspección en runtime.
