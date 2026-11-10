import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as text) {
      <div class="alert alert-danger d-flex justify-content-between align-items-start gap-3" role="alert">
        <span>{{ text }}</span>
        <div class="d-flex gap-2 flex-shrink-0">
          @if (retryable()) {
            <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry.emit()">Reintentar</button>
          }
          <button type="button" class="btn-close" aria-label="Cerrar" (click)="dismiss.emit()"></button>
        </div>
      </div>
    }
  `,
})
export class ErrorAlertComponent {
  readonly message = input<string | null | undefined>(null);
  readonly retryable = input(false);
  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
