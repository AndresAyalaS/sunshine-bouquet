import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, OperatorFunction, catchError, map, throwError } from 'rxjs';
import {
  ASSIGN_ORDER_TO_STORE_MUTATION,
  CREATE_ORDER_MUTATION,
  ORDERS_QUERY,
  ORDER_QUERY,
  ORDER_STATS_QUERY,
  UPDATE_ORDER_STATUS_MUTATION,
} from '../graphql/operations';
import { toAppError } from '../errors/app-error';
import { CreateOrderInput, Order, OrderStats, OrderStatus } from '../models/order.model';

/** Traduce cualquier fallo del cliente GraphQL a un AppError. */
function mapErrors<T>(): OperatorFunction<T, T> {
  return catchError((error: unknown) => throwError(() => toAppError(error)));
}

/** Única puerta de entrada a la API de órdenes. Los componentes no conocen GraphQL. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apollo = inject(Apollo);

  list(status?: OrderStatus | null): Observable<Order[]> {
    return this.apollo
      .query<{ orders: Order[] }, { status: OrderStatus | null }>({
        query: ORDERS_QUERY,
        variables: { status: status ?? null },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data?.orders ?? []),
        mapErrors(),
      );
  }

  get(id: string): Observable<Order | null> {
    return this.apollo
      .query<{ order: Order | null }, { id: string }>({
        query: ORDER_QUERY,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data?.order ?? null),
        mapErrors(),
      );
  }

  stats(): Observable<OrderStats> {
    return this.apollo
      .query<{ orderStats: OrderStats }>({
        query: ORDER_STATS_QUERY,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data!.orderStats),
        mapErrors(),
      );
  }

  create(input: CreateOrderInput): Observable<Order> {
    return this.apollo
      .mutate<{ createOrder: Order }, { input: CreateOrderInput }>({
        mutation: CREATE_ORDER_MUTATION,
        variables: { input },
      })
      .pipe(
        map((result) => result.data!.createOrder),
        mapErrors(),
      );
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.apollo
      .mutate<{ updateOrderStatus: Order }, { id: string; status: OrderStatus }>({
        mutation: UPDATE_ORDER_STATUS_MUTATION,
        variables: { id, status },
      })
      .pipe(
        map((result) => result.data!.updateOrderStatus),
        mapErrors(),
      );
  }

  assignToStore(id: string, customerStore: string): Observable<Order> {
    return this.apollo
      .mutate<{ assignOrderToStore: Order }, { id: string; customerStore: string }>({
        mutation: ASSIGN_ORDER_TO_STORE_MUTATION,
        variables: { id, customerStore },
      })
      .pipe(
        map((result) => result.data!.assignOrderToStore),
        mapErrors(),
      );
  }
}
