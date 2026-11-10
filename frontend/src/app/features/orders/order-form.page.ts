import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorText } from '../../core/errors/app-error';
import { CreateOrderInput } from '../../core/models/order.model';
import { OrdersService } from '../../core/services/orders.service';
import { ErrorAlertComponent } from '../../shared/error-alert/error-alert.component';

export const MAX_TEXT = 100;
export const MAX_QUANTITY = 100_000;

export const LATAM_COUNTRIES = [
  'Colombia',
  'Ecuador',
  'Perú',
  'México',
  'Costa Rica',
  'Guatemala',
  'Chile',
  'Argentina',
  'Brasil',
  'Kenia',
] as const;

@Component({
  selector: 'app-order-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ErrorAlertComponent],
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-lg-8 col-xl-6">
        <h1 class="h3 mb-3">Nueva orden de exportación</h1>

        <app-error-alert [message]="submitError()" (dismiss)="submitError.set(null)" />

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="card card-body">
          <div class="mb-3">
            <label class="form-label" for="customerStore">Tienda cliente</label>
            <input
              id="customerStore"
              class="form-control"
              formControlName="customerStore"
              [class.is-invalid]="invalid('customerStore')"
              autocomplete="off"
            />
            @if (invalid('customerStore')) {
              <div class="invalid-feedback">{{ message('customerStore') }}</div>
            }
          </div>

          <div class="row">
            <div class="col-12 col-md-6 mb-3">
              <label class="form-label" for="originCountry">País de origen</label>
              <select
                id="originCountry"
                class="form-select"
                formControlName="originCountry"
                [class.is-invalid]="invalid('originCountry')"
              >
                <option value="" disabled>Selecciona…</option>
                @for (country of countries; track country) {
                  <option [value]="country">{{ country }}</option>
                }
              </select>
              @if (invalid('originCountry')) {
                <div class="invalid-feedback">{{ message('originCountry') }}</div>
              }
            </div>

            <div class="col-12 col-md-6 mb-3">
              <label class="form-label" for="destinationCity">Ciudad de destino (USA)</label>
              <input
                id="destinationCity"
                class="form-control"
                formControlName="destinationCity"
                [class.is-invalid]="invalid('destinationCity')"
                autocomplete="off"
              />
              @if (invalid('destinationCity')) {
                <div class="invalid-feedback">{{ message('destinationCity') }}</div>
              }
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label" for="bouquetQuantity">Cantidad de ramos</label>
            <input
              id="bouquetQuantity"
              type="number"
              inputmode="numeric"
              class="form-control"
              formControlName="bouquetQuantity"
              [class.is-invalid]="invalid('bouquetQuantity')"
            />
            @if (invalid('bouquetQuantity')) {
              <div class="invalid-feedback">{{ message('bouquetQuantity') }}</div>
            }
          </div>

          <div class="d-flex justify-content-end gap-2">
            <a class="btn btn-outline-secondary" routerLink="/orders">Cancelar</a>
            <button type="submit" class="btn btn-primary" [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              }
              Crear orden
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class OrderFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly countries = LATAM_COUNTRIES;
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    customerStore: ['', [Validators.required, Validators.maxLength(MAX_TEXT)]],
    originCountry: ['', [Validators.required]],
    destinationCity: ['', [Validators.required, Validators.maxLength(MAX_TEXT)]],
    bouquetQuantity: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.max(MAX_QUANTITY), Validators.pattern(/^\d+$/)],
    ],
  });

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected message(name: keyof typeof this.form.controls): string {
    const errors = this.form.controls[name].errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return 'Este campo es obligatorio.';
    }
    if (errors['maxlength']) {
      return `Máximo ${MAX_TEXT} caracteres.`;
    }
    if (errors['pattern']) {
      return 'Debe ser un número entero.';
    }
    if (errors['min'] || errors['max']) {
      return `Debe estar entre 1 y ${MAX_QUANTITY}.`;
    }
    return 'Valor no válido.';
  }

  protected submit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const input: CreateOrderInput = {
      customerStore: value.customerStore.trim(),
      originCountry: value.originCountry,
      destinationCity: value.destinationCity.trim(),
      bouquetQuantity: Number(value.bouquetQuantity),
    };

    this.submitting.set(true);
    this.api.create(input).subscribe({
      next: (order) => void this.router.navigate(['/orders', order.id]),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.submitError.set(errorText(err));
      },
    });
  }
}
