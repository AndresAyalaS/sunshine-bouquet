# Sunshine Bouquet – Gestión de Órdenes de Exportación (MVP)

[![CI](https://github.com/AndresAyalaS/sunshine-bouquet/actions/workflows/ci.yml/badge.svg)](https://github.com/AndresAyalaS/sunshine-bouquet/actions/workflows/ci.yml)

MVP para gestionar órdenes de exportación de ramos de flores desde LATAM hacia centros de distribución en USA.
Permite crear órdenes, consultarlas, cambiar su estado logístico y asignarlas a tiendas cliente.

## Contenido

- [Arquitectura](#arquitectura)
- [Cómo ejecutar](#cómo-ejecutar)
- [Pruebas](#pruebas)
- [API GraphQL](#api-graphql)
- [Frontend](#frontend)
- [DevOps: Docker, Husky y CI](#devops-docker-husky-y-ci)
- [Decisiones técnicas](#decisiones-técnicas)
- [Mejoras futuras](#mejoras-futuras)

## Arquitectura

```
Navegador ──► Angular + nginx (:4200) ──/graphql──► Apollo Gateway (Node, :4000) ──► API .NET 8 / HotChocolate (:5000) ──► SQL Server (:1433)
              SPA + Apollo Client                    supergrafo federado               subgrafo "orders"                      EF Core
```

El navegador solo habla con su mismo origen: nginx (en Docker) o el proxy de `ng serve` (en desarrollo) reenvía
`/graphql` al gateway, por lo que no hay que configurar CORS.

### Estructura del repositorio

```
sunshine-bouquet/
├── backend/                 # Solución .NET 8 (Clean Architecture)
│   ├── src/
│   │   ├── SunshineBouquet.Domain/          # Order, OrderStatus, reglas de negocio
│   │   ├── SunshineBouquet.Application/     # Casos de uso (OrderService), puerto IOrderRepository
│   │   ├── SunshineBouquet.Infrastructure/  # EF Core, migraciones, repositorio
│   │   └── SunshineBouquet.Api/             # Esquema GraphQL (HotChocolate), filtro de errores
│   └── tests/SunshineBouquet.Tests/         # Unitarias (Domain/Application) + integración (Api)
├── gateway/                 # Apollo Gateway (federación)
├── frontend/                # Angular
│   └── src/app/
│       ├── core/            # Cliente Apollo, operaciones GraphQL, modelos, servicio, errores
│       ├── features/        # dashboard/, orders/ (listado, formulario, detalle)
│       └── shared/          # Componentes reutilizables
├── docs/                    # Colección Postman
├── scripts/                 # Migraciones y prueba de humo
├── .github/workflows/ci.yml # Pipeline de CI
├── .husky/                  # Hooks de Git
└── docker-compose.yml
```

### Backend en capas (dependencias hacia adentro)

| Proyecto | Responsabilidad | Depende de |
|---|---|---|
| `Domain` | `Order` (aggregate root), `OrderStatus`, reglas y transiciones. Sin dependencias externas. | — |
| `Application` | Casos de uso (`OrderService`), puerto `IOrderRepository`. | Domain |
| `Infrastructure` | EF Core + SQL Server, repositorio, configuración de entidad, migraciones. | Application |
| `Api` | Esquema GraphQL (HotChocolate), filtro de errores, `Program`. | Application, Infrastructure |

### Modelo de dominio

`Order`: `Id`, `CustomerStore`, `OriginCountry`, `DestinationCity`, `BouquetQuantity`, `Status`, `CreatedAt`.

Transiciones de estado permitidas:

```
CREATED ──► IN_TRANSIT ──► DELIVERED
   └──────► CANCELLED
```

## Cómo ejecutar

### Requisitos

- Docker y Docker Compose (opción recomendada), o
- .NET 8 SDK + Node.js 24 + una instancia de SQL Server (opción sin Docker).

### Todo con Docker

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend (Angular) | http://localhost:4200 |
| Gateway GraphQL | http://localhost:4000/ |
| API (subgrafo, Banana Cake Pop incluido) | http://localhost:5000/graphql |
| SQL Server | `localhost:1433` (usuario `sa`) |

La API aplica las migraciones automáticamente al iniciar (con reintentos mientras SQL Server arranca).

### Sin Docker

```bash
# 1. SQL Server (por ejemplo en contenedor):
docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD=Your_strong_Passw0rd -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# 2. API .NET (http://localhost:5000)
cd backend && dotnet run --project src/SunshineBouquet.Api

# 3. Gateway (http://localhost:4000)
cd gateway && npm install && npm start

# 4. Frontend (http://localhost:4200, con proxy de /graphql al gateway)
cd frontend && npm install && npm start
```

### Migraciones

```bash
scripts/add-migration.sh <NombreMigracion>
```

## Pruebas

```bash
# Backend (unitarias de dominio y servicio + integración del esquema GraphQL con EF InMemory)
cd backend && dotnet test

# Frontend (Vitest)
cd frontend && npm test -- --no-watch

# Lint del frontend
npm run lint            # desde la raíz

# Prueba de humo contra el sistema levantado
scripts/smoke-test.sh http://localhost:4000/
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

### Colección Postman

En [`docs/sunshine-bouquet.postman_collection.json`](docs/sunshine-bouquet.postman_collection.json) hay una colección
lista para importar en Postman (**Import → seleccionar el archivo**). Contiene:

- **Queries**: listado, filtro por estado, detalle y estadísticas.
- **Mutations**: crear orden, asignar a tienda, CREATED → IN_TRANSIT, IN_TRANSIT → DELIVERED y cancelar.
- **Errores esperados**: transición inválida, cantidad inválida, campo requerido y orden inexistente (con tests que validan el `code`).

Variables: `gatewayUrl` (por defecto `http://localhost:4000/`) y `orderId` (se llena sola al ejecutar *Crear orden*).
Orden sugerido: Mutations 1 → 2 → 3 → 4, luego Queries y Errores esperados.

## Frontend

Angular con componentes standalone y carga diferida (lazy loading) por feature, Bootstrap + SCSS, Apollo Client
para consumir GraphQL y Reactive Forms.

| Ruta | Pantalla |
|---|---|
| `/` | Dashboard: total de órdenes y órdenes por estado |
| `/orders` | Listado con filtro por estado |
| `/orders/new` | Crear orden (Reactive Forms con validaciones) |
| `/orders/:id` | Detalle, asignación a tienda y cambio de estado |

- **Componentes reutilizables** (`shared/`): `status-badge`, `order-status-actions`, `confirm-dialog`, `error-alert`, `loading`.
- **Capa de acceso a datos** (`core/`): las operaciones GraphQL viven en `operations.ts` y `OrdersService` es el único
  punto que habla con Apollo; las pantallas no conocen GraphQL.
- **Manejo de errores**: los errores de red y de negocio (`extensions.code`) se traducen a un `AppError` y se muestran con `error-alert`.
- **Responsive**: layout basado en la grilla de Bootstrap.

## DevOps: Docker, Husky y CI

### Docker

`docker-compose.yml` levanta cuatro servicios: `db` (SQL Server con healthcheck), `api`, `gateway` y `frontend`
(build de Angular servido por nginx). La API espera a que la base de datos esté saludable.

### Husky (pre-commit)

Husky vive en la raíz del repo. Antes de cada commit se ejecuta el lint del frontend (`npm run lint`) y, si falla,
el commit se bloquea. Se activa solo al ejecutar `npm install` en la raíz (script `prepare`).

```bash
npm install   # en la raíz, una sola vez tras clonar
```

### CI (GitHub Actions)

`.github/workflows/ci.yml` se ejecuta en cada push a `main` y en cada Pull Request:

| Job | Pasos |
|---|---|
| `backend` | restore → build (Release) → test |
| `frontend` | `npm ci` → lint → test → build |
| `docker` | `docker compose build` (valida que las imágenes construyan; corre tras los dos anteriores) |

## Decisiones técnicas

- **Reglas en el dominio**: `Order` tiene constructor privado y fábrica `Create`; las transiciones permitidas
  (CREATED→IN_TRANSIT, IN_TRANSIT→DELIVERED, CREATED→CANCELLED) están en una tabla, no en `if` dispersos (OCP).
- **DIP**: `Application` define `IOrderRepository`; EF Core es un detalle de Infrastructure y se sustituye en tests.
- **Reloj inyectable** (`TimeProvider`) para tests deterministas.
- **Estado como texto en BD** (`HasConversion<string>`): legible y robusto ante reordenar el enum.
- **"Asignar a tienda cliente"** se modeló como `assignOrderToStore`, permitido solo en órdenes CREATED.
- **`orderStats`** devuelve siempre los 4 estados (con 0) para simplificar el dashboard.
- **Apollo Gateway + federación**: HotChocolate expone el subgrafo (`AddApolloFederation`) y el gateway lo compone con `IntrospectAndCompose`.
- **Un solo origen en el frontend**: el navegador llama a `/graphql` y nginx / el proxy de desarrollo lo reenvían al gateway, evitando CORS.
- **Errores con códigos estables**: el backend traduce excepciones de dominio a `extensions.code`, y el frontend los convierte en un `AppError` (mensaje legible + código) para mostrarlos al usuario.
- **Husky en la raíz con un único comando de lint**: el repo es un monorepo, y `ng lint` ya cubre todo el frontend, por lo que no se necesita `lint-staged`.
- **Tests**: unitarios de dominio y servicio (sin BD) + integración del esquema GraphQL real con EF InMemory en el backend; specs de componentes y servicio en el frontend.

## Mejoras futuras

- Concurrencia optimista (`rowversion`) al cambiar estado.
- Paginación (cursor) y filtros/orden en `orders`.
- Entidad `CustomerStore` propia (catálogo) en lugar de texto libre; historial de cambios de estado (auditoría).
- Autenticación/autorización y observabilidad (OpenTelemetry).
- Supergrafo estático en CI en lugar de introspección en runtime.
- Secretos fuera del `docker-compose.yml` (archivo `.env`) y configuración por ambiente.
- Publicar las imágenes Docker desde el CI (registro) y añadir un job de despliegue.
- Pruebas end-to-end (Playwright/Cypress) y análisis de cobertura en el pipeline.
