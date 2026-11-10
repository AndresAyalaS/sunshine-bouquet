import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ALLOWED_TRANSITIONS, Order, OrderStatus } from '../../core/models/order.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  IN_TRANSIT: 'Enviar',
  DELIVERED: 'Marcar entregada',
  CANCELLED: 'Cancelar',
};

/**
 * Botones con solo las transiciones válidas para la orden. Reutilizable en listado y detalle.
 * Cancelar abre un diálogo de confirmación porque no se puede deshacer.
 */
@Component({
  selector: 'app-order-status-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    <div class="d-flex flex-wrap gap-2 align-items-center">
      @for (target of targets(); track target) {
        <button
          type="button"
          class="btn btn-sm"
          [class]="target === 'CANCELLED' ? 'btn-outline-danger' : 'btn-outline-primary'"
          [disabled]="disabled()"
          (click)="request(target)"
        >
          {{ labelFor(target) }}
        </button>
      } @empty {
        <span class="text-body-secondary small">Sin acciones disponibles</span>
      }
    </div>

    <app-confirm-dialog
      [open]="confirmingCancel()"
      title="Cancelar orden"
      [message]="cancelMessage()"
      confirmLabel="Confirmar"
      dismissLabel="No cancelar"
      (confirmed)="confirmCancel()"
      (dismissed)="confirmingCancel.set(false)"
    />
  `,
})
export class OrderStatusActionsComponent {
  readonly order = input.required<Order>();
  readonly disabled = input(false);
  readonly statusChange = output<OrderStatus>();

  protected readonly confirmingCancel = signal(false);
  protected readonly targets = computed(() => ALLOWED_TRANSITIONS[this.order().status]);
  protected readonly cancelMessage = computed(
    () => `¿Seguro que deseas cancelar la orden de ${this.order().customerStore}? Esta acción no se puede deshacer.`,
  );

  protected labelFor(target: OrderStatus): string {
    return ACTION_LABELS[target] ?? target;
  }

  protected request(target: OrderStatus): void {
    if (target === 'CANCELLED') {
      this.confirmingCancel.set(true);
      return;
    }
    this.statusChange.emit(target);
  }

  protected confirmCancel(): void {
    this.confirmingCancel.set(false);
    this.statusChange.emit('CANCELLED');
  }
}
