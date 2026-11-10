import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AppError } from '../../core/errors/app-error';
import { OrderStats } from '../../core/models/order.model';
import { OrdersService } from '../../core/services/orders.service';
import { DashboardPage } from './dashboard.page';

const stats: OrderStats = {
  total: 10,
  byStatus: [
    { status: 'CREATED', count: 4 },
    { status: 'IN_TRANSIT', count: 3 },
    { status: 'DELIVERED', count: 2 },
    { status: 'CANCELLED', count: 1 },
  ],
};

function render(statsFn: () => ReturnType<OrdersService['stats']>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: OrdersService, useValue: { stats: statsFn } }],
  });
  const fixture = TestBed.createComponent(DashboardPage);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('DashboardPage', () => {
  it('muestra el total y el conteo por estado', async () => {
    const { fixture, el } = render(() => of(stats));
    await fixture.whenStable();

    expect(el.querySelector('[data-testid=total]')?.textContent?.trim()).toBe('10');
    expect(el.querySelector('[data-testid=count-CREATED]')?.textContent?.trim()).toBe('4');
    expect(el.querySelector('[data-testid=count-IN_TRANSIT]')?.textContent?.trim()).toBe('3');
    expect(el.querySelector('[data-testid=count-DELIVERED]')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('[data-testid=count-CANCELLED]')?.textContent?.trim()).toBe('1');
  });

  it('con cero órdenes muestra el estado vacío', async () => {
    const empty: OrderStats = { total: 0, byStatus: stats.byStatus.map((s) => ({ ...s, count: 0 })) };
    const { fixture, el } = render(() => of(empty));
    await fixture.whenStable();

    expect(el.textContent).toContain('Aún no hay órdenes');
  });

  it('si falla la carga, muestra el error con opción de reintentar', async () => {
    const { fixture, el } = render(() => throwError(() => new AppError('No se pudo conectar con el servidor.')));
    await fixture.whenStable();

    expect(el.querySelector('.alert-danger')?.textContent).toContain('No se pudo conectar con el servidor.');
    expect(el.textContent).toContain('Reintentar');
  });
});
