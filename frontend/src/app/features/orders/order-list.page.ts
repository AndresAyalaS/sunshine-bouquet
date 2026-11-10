import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { errorText } from '../../core/errors/app-error';
import { ORDER_STATUSES, Order, OrderStatus, STATUS_LABELS, isOrderStatus } from '../../core/models/order.model';
import { OrdersService } from '../../core/services/orders.service';
import { ErrorAlertComponent } from '../../shared/error-alert/error-alert.component';
import { LoadingComponent } from '../../shared/loading/loading.component';
import { OrderStatusActionsComponent } from '../../shared/order-status-actions/order-status-actions.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-order-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    ErrorAlertComponent,
    LoadingComponent,
    OrderStatusActionsComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Órdenes</h1>
      <a class="btn btn-primary" routerLink="/orders/new">Nueva orden</a>
    </div>

    <div class="row g-2 mb-3">
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <label class="form-label small mb-1" for="status-filter">Filtrar por estado</label>
        <select
          id="status-filter"
          class="form-select"
          [value]="statusFilter() ?? ''"
          (change)="onFilterChange($any($event.target).value)"
        >
          <option value="">Todos</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ labels[s] }}</option>
          }
        </select>
      </div>
    </div>

    <app-error-alert
      [message]="loadError()"
      [retryable]="true"
      (retry)="orders.reload()"
      (dismiss)="loadDismissed.set(true)"
    />
    <app-error-alert [message]="actionError()" (dismiss)="actionError.set(null)" />

    @if (orders.isLoading() && !orders.hasValue()) {
      <app-loading />
    } @else if (orders.hasValue()) {
      @if (orders.value().length === 0) {
        <div class="card card-body text-center text-body-secondary">
          No hay órdenes @if (statusFilter()) { con ese estado } @else { todavía }.
        </div>
      } @else {
        <div class="table-responsive card">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Tienda</th>
                <th>Origen</th>
                <th>Destino</th>
                <th class="text-end">Ramos</th>
                <th>Estado</th>
                <th>Creada</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders.value(); track order.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/orders', order.id]" class="fw-semibold text-decoration-none">
                      {{ order.customerStore }}
                    </a>
                  </td>
                  <td>{{ order.originCountry }}</td>
                  <td>{{ order.destinationCity }}</td>
                  <td class="text-end">{{ order.bouquetQuantity }}</td>
                  <td><app-status-badge [status]="order.status" /></td>
                  <td class="text-nowrap">{{ order.createdAt | date: 'short' }}</td>
                  <td class="text-end">
                    <div class="d-flex justify-content-end gap-2 flex-wrap">
                      <app-order-status-actions
                        [order]="order"
                        [disabled]="busyId() === order.id"
                        (statusChange)="changeStatus(order, $event)"
                      />
                      <a class="btn btn-sm btn-outline-secondary" [routerLink]="['/orders', order.id]">Detalle</a>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class OrderListPage {
  private readonly api = inject(OrdersService);
  private readonly router = inject(Router);

  /** Query param `?status=` (enlazado por withComponentInputBinding). */
  readonly status = input<string | undefined>();

  protected readonly statuses = ORDER_STATUSES;
  protected readonly labels = STATUS_LABELS;

  protected readonly statusFilter = computed<OrderStatus | null>(() => {
    const value = this.status();
    return isOrderStatus(value) ? value : null;
  });

  protected readonly orders = rxResource({
    params: () => this.statusFilter(),
    stream: ({ params }) => this.api.list(params),
  });

  protected readonly loadDismissed = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly loadError = computed(() => {
    const err = this.orders.error();
    return err && !this.loadDismissed() ? errorText(err) : null;
  });

  protected onFilterChange(value: string): void {
    this.loadDismissed.set(false);
    void this.router.navigate([], { queryParams: { status: value || null }, queryParamsHandling: 'merge' });
  }

  protected changeStatus(order: Order, target: OrderStatus): void {
    this.actionError.set(null);
    this.busyId.set(order.id);
    this.api.updateStatus(order.id, target).subscribe({
      next: () => {
        this.busyId.set(null);
        this.orders.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.actionError.set(errorText(err));
      },
    });
  }
}
