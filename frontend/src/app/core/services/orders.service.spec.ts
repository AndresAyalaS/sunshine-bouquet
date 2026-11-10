import { TestBed } from '@angular/core/testing';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { provideApollo } from 'apollo-angular';
import { Observable, firstValueFrom } from 'rxjs';
import { AppError } from '../errors/app-error';
import { OrdersService } from './orders.service';

interface LinkResult { data?: unknown; errors?: { message: string; extensions?: Record<string, unknown> }[] }

/** Cliente Apollo real con un link falso que responde lo que indique el test. */
function setup(respond: (operationName: string | undefined) => LinkResult) {
  const seen: { operationName: string | undefined; variables: unknown }[] = [];

  TestBed.configureTestingModule({
    providers: [
      provideApollo(() => ({
        cache: new InMemoryCache(),
        link: new ApolloLink(
          (operation) =>
            new Observable((subscriber) => {
              seen.push({ operationName: operation.operationName, variables: operation.variables });
              subscriber.next(respond(operation.operationName) as never);
              subscriber.complete();
            }),
        ),
      })),
    ],
  });

  return { service: TestBed.inject(OrdersService), seen };
}

describe('OrdersService', () => {
  it('list envía el filtro de estado y devuelve las órdenes', async () => {
    const { service, seen } = setup(() => ({
      data: {
        orders: [
          {
            __typename: 'Order',
            id: '1',
            customerStore: 'Flower Shop NYC',
            originCountry: 'Colombia',
            destinationCity: 'Miami',
            bouquetQuantity: 10,
            status: 'CANCELLED',
            createdAt: '2026-11-09T12:00:00Z',
          },
        ],
      },
    }));

    const orders = await firstValueFrom(service.list('CANCELLED'));

    expect(orders.map((o) => o.id)).toEqual(['1']);
    expect(seen[0].variables).toEqual({ status: 'CANCELLED' });
  });

  it('traduce un error de negocio de GraphQL a AppError con su código', async () => {
    const { service } = setup(() => ({
      data: { updateOrderStatus: null },
      errors: [
        {
          message: 'No se puede pasar de InTransit a Cancelled.',
          extensions: { code: 'INVALID_STATUS_TRANSITION' },
        },
      ],
    }));

    const error = await firstValueFrom(service.updateStatus('1', 'CANCELLED')).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toBe('No se puede pasar de InTransit a Cancelled.');
    expect((error as AppError).code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('traduce un fallo de red a un mensaje amigable', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideApollo(() => ({
          cache: new InMemoryCache(),
          link: new ApolloLink(() => new Observable((s) => s.error(new TypeError('Failed to fetch')))),
        })),
      ],
    });
    const service = TestBed.inject(OrdersService);

    const error = await firstValueFrom(service.stats()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toContain('No se pudo conectar');
  });
});
