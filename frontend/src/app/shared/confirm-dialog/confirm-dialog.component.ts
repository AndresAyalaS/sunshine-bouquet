import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Diálogo modal de confirmación (Bootstrap, sin su JS).
 * - El foco inicial va al botón seguro ("No cancelar") para evitar confirmaciones accidentales.
 * - Se cierra con Escape, con la X o haciendo clic fuera; cualquiera de ellos emite `dismissed`.
 * - Bloquea el scroll del fondo mientras está abierto.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-backdrop fade show"></div>
      <div
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="bodyId"
        (click)="onBackdropClick($event)"
        (keydown.escape)="dismissed.emit()"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title h5" [id]="titleId">{{ title() }}</h2>
              <button type="button" class="btn-close" aria-label="Cerrar" (click)="dismissed.emit()"></button>
            </div>
            <div class="modal-body" [id]="bodyId">{{ message() }}</div>
            <div class="modal-footer">
              <button #dismissButton type="button" class="btn btn-outline-secondary" (click)="dismissed.emit()">
                {{ dismissLabel() }}
              </button>
              <button
                type="button"
                class="btn"
                [class]="danger() ? 'btn-danger' : 'btn-primary'"
                (click)="confirmed.emit()"
              >
                {{ confirmLabel() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly dismissLabel = input('No cancelar');
  readonly danger = input(true);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  protected readonly titleId = `confirm-title-${nextId}`;
  protected readonly bodyId = `confirm-body-${nextId++}`;

  private readonly dismissButton = viewChild<ElementRef<HTMLButtonElement>>('dismissButton');
  private readonly document = inject(DOCUMENT);

  constructor() {
    // Foco inicial en la opción segura cuando el diálogo aparece.
    effect(() => this.dismissButton()?.nativeElement.focus());

    // Evita que la página de fondo haga scroll mientras el diálogo está abierto.
    effect(() => this.document.body.classList.toggle('modal-open', this.open()));
    inject(DestroyRef).onDestroy(() => this.document.body.classList.remove('modal-open'));
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Solo si el clic fue en el fondo oscuro, no dentro del cuadro del diálogo.
    if (event.target === event.currentTarget) {
      this.dismissed.emit();
    }
  }
}
