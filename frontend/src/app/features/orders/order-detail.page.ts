import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorText } from '../../core/errors/app-error';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrdersService } from '../../core/services/orders.service';
import { ErrorAlertComponent } from '../../shared/error-alert/error-alert.component';
import { LoadingComponent } from '../../shared/loading/loading.component';
import { OrderStatusActionsComponent } from '../../shared/order-status-actions/order-status-actions.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ErrorAlertComponent,
    LoadingComponent,
    OrderStatusActionsComponent,
    StatusBadgeComponent,
  ],
  template: `
    <a routerLink="/orders" class="text-decoration-none small">&larr; Volver a órdenes</a>

    <app-error-alert
      [message]="loadError()"
      [retryable]="true"
      (retry)="order.reload()"
      (dismiss)="loadDismissed.set(true)"
    />
    <app-error-alert [message]="actionError()" (dismiss)="actionError.set(null)" />

    @if (order.isLoading() && !order.hasValue()) {
      <app-loading />
    } @else if (order.hasValue()) {
      @if (order.value(); as o) {
        <div class="card mt-3">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h1 class="h4 mb-1">{{ o.customerStore }}</h1>
                <div class="text-body-secondary small">Orden {{ o.id }}</div>
              </div>
              <app-status-badge [status]="o.status" />
            </div>

            <dl class="row mb-4">
              <dt class="col-sm-4 col-md-3">País de origen</dt>
              <dd class="col-sm-8 col-md-9">{{ o.originCountry }}</dd>
              <dt class="col-sm-4 col-md-3">Ciudad de destino</dt>
              <dd class="col-sm-8 col-md-9">{{ o.destinationCity }}</dd>
              <dt class="col-sm-4 col-md-3">Cantidad de ramos</dt>
              <dd class="col-sm-8 col-md-9">{{ o.bouquetQuantity }}</dd>
              <dt class="col-sm-4 col-md-3">Creada</dt>
              <dd class="col-sm-8 col-md-9">{{ o.createdAt | date: 'medium' }}</dd>
            </dl>

            <h2 class="h6">Cambiar estado</h2>
            <app-order-status-actions [order]="o" [disabled]="busy()" (statusChange)="changeStatus(o, $event)" />
          </div>
        </div>

        @if (o.status === 'CREATED') {
          <form [formGroup]="storeForm" (ngSubmit)="assign(o)" class="card card-body mt-3" novalidate>
            <h2 class="h6">Asignar a otra tienda cliente</h2>
            <div class="row g-2">
              <div class="col-12 col-md">
                <label class="visually-hidden" for="store">Tienda cliente</label>
                <input
                  id="store"
                  class="form-control"
                  formControlName="customerStore"
                  placeholder="Nombre de la tienda"
                  [class.is-invalid]="storeForm.controls.customerStore.invalid && storeForm.controls.customerStore.touched"
                />
                <div class="invalid-feedback">Indica una tienda (máximo 100 caracteres).</div>
              </div>
              <div class="col-12 col-md-auto">
                <button type="submit" class="btn btn-outline-primary w-100" [disabled]="busy()">Asignar</button>
              </div>
            </div>
          </form>
        }
      } @else {
        <div class="alert alert-warning mt-3" role="alert">No se encontró la orden solicitada.</div>
      }
    }
  `,
})
export class OrderDetailPage {
  private readonly api = inject(OrdersService);
  private readonly fb = inject(FormBuilder);

  /** Parámetro de ruta `:id` (enlazado por withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly order = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly loadDismissed = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly loadError = computed(() => {
    const err = this.order.error();
    return err && !this.loadDismissed() ? errorText(err) : null;
  });

  protected readonly storeForm = this.fb.nonNullable.group({
    customerStore: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected changeStatus(order: Order, target: OrderStatus): void {
    this.run(this.api.updateStatus(order.id, target));
  }

  protected assign(order: Order): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }
    this.run(this.api.assignToStore(order.id, this.storeForm.getRawValue().customerStore.trim()), () =>
      this.storeForm.reset(),
    );
  }

  private run(action$: ReturnType<OrdersService['updateStatus']>, onDone?: () => void): void {
    this.actionError.set(null);
    this.busy.set(true);
    action$.subscribe({
      next: () => {
        this.busy.set(false);
        onDone?.();
        this.order.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.actionError.set(errorText(err));
      },
    });
  }
}
