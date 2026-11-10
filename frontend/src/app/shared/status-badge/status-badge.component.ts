import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus, STATUS_LABELS } from '../../core/models/order.model';

const BADGE_CLASSES: Record<OrderStatus, string> = {
  CREATED: 'text-bg-secondary',
  IN_TRANSIT: 'text-bg-primary',
  DELIVERED: 'text-bg-success',
  CANCELLED: 'text-bg-danger',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="badgeClass()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<OrderStatus>();

  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
  protected readonly badgeClass = computed(() => BADGE_CLASSES[this.status()]);
}
