import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderStatusActionsComponent } from './order-status-actions.component';

function orderWith(status: OrderStatus): Order {
  return {
    id: '1',
    customerStore: 'Flower Shop NYC',
    originCountry: 'Colombia',
    destinationCity: 'Miami',
    bouquetQuantity: 100,
    status,
    createdAt: '2026-11-09T12:00:00Z',
  };
}

describe('OrderStatusActionsComponent', () => {
  let fixture: ComponentFixture<OrderStatusActionsComponent>;

  async function render(status: OrderStatus): Promise<HTMLElement> {
    fixture = TestBed.createComponent(OrderStatusActionsComponent);
    fixture.componentRef.setInput('order', orderWith(status));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  /** Botones de acción (fuera del diálogo). */
  const actionTexts = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.d-flex button')).map((b) => b.textContent!.trim());

  const dialogButton = (el: HTMLElement, text: string) =>
    Array.from(el.querySelectorAll('[role=dialog] button')).find((b) =>
      b.textContent!.includes(text),
    ) as HTMLButtonElement;

  it('CREATED ofrece enviar y cancelar', async () => {
    const el = await render('CREATED');
    expect(actionTexts(el)).toEqual(['Enviar', 'Cancelar']);
  });

  it('IN_TRANSIT solo ofrece marcar entregada', async () => {
    const el = await render('IN_TRANSIT');
    expect(actionTexts(el)).toEqual(['Marcar entregada']);
  });

  it.each<OrderStatus>(['DELIVERED', 'CANCELLED'])('%s no ofrece acciones', async (status) => {
    const el = await render(status);
    expect(actionTexts(el)).toEqual([]);
    expect(el.textContent).toContain('Sin acciones disponibles');
  });

  it('emite el nuevo estado al pulsar Enviar, sin pedir confirmación', async () => {
    const el = await render('CREATED');
    const emitted: OrderStatus[] = [];
    fixture.componentInstance.statusChange.subscribe((s) => emitted.push(s));

    (el.querySelectorAll('.d-flex button')[0] as HTMLButtonElement).click();

    expect(emitted).toEqual(['IN_TRANSIT']);
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('Cancelar abre el diálogo con el mensaje y no emite todavía', async () => {
    const el = await render('CREATED');
    const emitted: OrderStatus[] = [];
    fixture.componentInstance.statusChange.subscribe((s) => emitted.push(s));

    (el.querySelectorAll('.d-flex button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(el.querySelector('[role=dialog]')).not.toBeNull();
    expect(el.querySelector('.modal-body')?.textContent).toContain('Flower Shop NYC');
    expect(emitted).toEqual([]);
  });

  it('"No cancelar" cierra el diálogo sin emitir', async () => {
    const el = await render('CREATED');
    const emitted: OrderStatus[] = [];
    fixture.componentInstance.statusChange.subscribe((s) => emitted.push(s));

    (el.querySelectorAll('.d-flex button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    dialogButton(el, 'No cancelar').click();
    await fixture.whenStable();

    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(emitted).toEqual([]);
  });

  it('"Confirmar" emite CANCELLED y cierra el diálogo', async () => {
    const el = await render('CREATED');
    const emitted: OrderStatus[] = [];
    fixture.componentInstance.statusChange.subscribe((s) => emitted.push(s));

    (el.querySelectorAll('.d-flex button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    dialogButton(el, 'Confirmar').click();
    await fixture.whenStable();

    expect(emitted).toEqual(['CANCELLED']);
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });
});
