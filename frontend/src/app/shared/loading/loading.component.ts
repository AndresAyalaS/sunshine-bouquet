import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex justify-content-center py-5" role="status" aria-live="polite">
      <div class="spinner-border text-primary" aria-hidden="true"></div>
      <span class="visually-hidden">Cargando…</span>
    </div>
  `,
})
export class LoadingComponent {}
