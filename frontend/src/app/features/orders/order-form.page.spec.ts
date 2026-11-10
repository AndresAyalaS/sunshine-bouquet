import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AppError } from '../../core/errors/app-error';
import { CreateOrderInput, Order } from '../../core/models/order.model';
import { OrdersService } from '../../core/services/orders.service';
import { OrderFormPage } from './order-form.page';

const created: Order = {
  id: 'abc',
  customerStore: 'Flower Shop NYC',
  originCountry: 'Colombia',
  destinationCity: 'Miami',
  bouquetQuantity: 250,
  status: 'CREATED',
  createdAt: '2026-11-09T12:00:00Z',
};

function setup(create: (input: CreateOrderInput) => Observable<Order>) {
  const calls: CreateOrderInput[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: OrdersService,
        useValue: {
          create: (input: CreateOrderInput) => {
            calls.push(input);
            return create(input);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(OrderFormPage);
  return { fixture, calls, el: fixture.nativeElement as HTMLElement, form: fixture.componentInstance.form };
}

describe('OrderFormPage', () => {
  it('no envía y marca errores cuando el formulario es inválido', async () => {
    const { fixture, calls, el } = setup(() => of(created));
    await fixture.whenStable();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(calls).toHaveLength(0);
    expect(el.querySelectorAll('.invalid-feedback').length).toBe(4);
  });

  it('valida cantidad mínima, máxima y entera', async () => {
    const { fixture, form } = setup(() => of(created));
    await fixture.whenStable();
    const quantity = form.controls.bouquetQuantity;

    quantity.setValue(0);
    expect(quantity.errors).toHaveProperty('min');
    quantity.setValue(100_001);
    expect(quantity.errors).toHaveProperty('max');
    quantity.setValue(1.5);
    expect(quantity.errors).toHaveProperty('pattern');
    quantity.setValue(250);
    expect(quantity.valid).toBe(true);
  });

  it('crea la orden con los datos recortados y navega al detalle', async () => {
    const { fixture, calls, form } = setup(() => of(created));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();

    form.setValue({
      customerStore: '  Flower Shop NYC ',
      originCountry: 'Colombia',
      destinationCity: ' Miami ',
      bouquetQuantity: 250,
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(calls).toEqual([
      { customerStore: 'Flower Shop NYC', originCountry: 'Colombia', destinationCity: 'Miami', bouquetQuantity: 250 },
    ]);
    expect(navigate).toHaveBeenCalledWith(['/orders', 'abc']);
  });

  it('muestra el error del backend y permite reintentar', async () => {
    const { fixture, el, form } = setup(() => throwError(() => new AppError('La cantidad de ramos no es válida.')));
    await fixture.whenStable();

    form.setValue({
      customerStore: 'Shop',
      originCountry: 'Colombia',
      destinationCity: 'Miami',
      bouquetQuantity: 5,
    });
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(el.querySelector('.alert-danger')?.textContent).toContain('La cantidad de ramos no es válida.');
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
  });
});
