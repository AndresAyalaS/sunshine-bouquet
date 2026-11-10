import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';
import { errorText } from '../../core/errors/app-error';
import { STATUS_LABELS } from '../../core/models/order.model';
import { ErrorAlertComponent } from '../../shared/error-alert/error-alert.component';
import { LoadingComponent } from '../../shared/loading/loading.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ErrorAlertComponent, LoadingComponent, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h3 mb-0">Dashboard</h1>
      <a class="btn btn-primary" routerLink="/orders/new">Nueva orden</a>
    </div>

    <app-error-alert
      [message]="error()"
      [retryable]="true"
      (retry)="stats.reload()"
      (dismiss)="dismissed.set(true)"
    />

    @if (stats.isLoading() && !stats.hasValue()) {
      <app-loading />
    } @else if (stats.hasValue()) {
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4 col-xl-3">
          <div class="card h-100 border-primary">
            <div class="card-body">
              <div class="text-body-secondary small">Total de órdenes</div>
              <div class="display-5 fw-semibold" data-testid="total">{{ stats.value().total }}</div>
              <a routerLink="/orders" class="stretched-link small">Ver todas</a>
            </div>
          </div>
        </div>

        @for (item of stats.value().byStatus; track item.status) {
          <div class="col-6 col-md-4 col-xl-3">
            <div class="card h-100">
              <div class="card-body">
                <app-status-badge [status]="item.status" />
                <div class="display-6 fw-semibold mt-2" [attr.data-testid]="'count-' + item.status">
                  {{ item.count }}
                </div>
                <a routerLink="/orders" [queryParams]="{ status: item.status }" class="stretched-link small">
                  Ver {{ label(item.status) }}
                </a>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="h6 mb-3">Distribución por estado</h2>
          @if (stats.value().total === 0) {
            <p class="text-body-secondary mb-0">Aún no hay órdenes. Crea la primera para ver la distribución.</p>
          } @else {
            @for (row of distribution(); track row.status) {
              <div class="mb-2">
                <div class="d-flex justify-content-between small">
                  <span>{{ label(row.status) }}</span>
                  <span>{{ row.count }} ({{ row.percent }}%)</span>
                </div>
                <div class="progress" role="progressbar" [attr.aria-valuenow]="row.percent" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-bar" [style.width.%]="row.percent"></div>
                </div>
              </div>
            }
          }
        </div>
      </div>
    }
  `,
})
export class DashboardPage {
  private readonly orders = inject(OrdersService);

  protected readonly dismissed = signal(false);
  protected readonly stats = rxResource({ stream: () => this.orders.stats() });

  protected readonly error = computed(() => {
    const err = this.stats.error();
    return err && !this.dismissed() ? errorText(err) : null;
  });

  protected readonly distribution = computed(() => {
    if (!this.stats.hasValue()) {
      return [];
    }
    const { total, byStatus } = this.stats.value();
    return byStatus.map((s) => ({
      ...s,
      percent: total === 0 ? 0 : Math.round((s.count / total) * 100),
    }));
  });

  protected label(status: keyof typeof STATUS_LABELS): string {
    return STATUS_LABELS[status].toLowerCase();
  }
}
