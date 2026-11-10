import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let el: HTMLElement;
  let confirmed: number;
  let dismissed: number;

  async function render(open: boolean): Promise<void> {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('title', 'Cancelar orden');
    fixture.componentRef.setInput('message', '¿Seguro?');
    fixture.componentRef.setInput('open', open);
    confirmed = 0;
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    await fixture.whenStable();
  }

  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.includes(text))!;

  it('no renderiza nada mientras está cerrado', async () => {
    await render(false);
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('muestra título, mensaje y los dos botones, y bloquea el scroll del fondo', async () => {
    await render(true);

    expect(el.querySelector('[role=dialog]')).not.toBeNull();
    expect(el.querySelector('.modal-title')?.textContent).toContain('Cancelar orden');
    expect(el.querySelector('.modal-body')?.textContent).toContain('¿Seguro?');
    expect(button('No cancelar')).toBeTruthy();
    expect(button('Confirmar')).toBeTruthy();
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });

  it('el foco inicial queda en "No cancelar" (opción segura)', async () => {
    await render(true);
    expect(document.activeElement).toBe(button('No cancelar'));
  });

  it('Confirmar emite confirmed y "No cancelar" emite dismissed', async () => {
    await render(true);

    button('Confirmar').click();
    expect(confirmed).toBe(1);
    expect(dismissed).toBe(0);

    button('No cancelar').click();
    expect(dismissed).toBe(1);
  });

  it('Escape y clic en el fondo lo descartan; clic dentro del cuadro no', async () => {
    await render(true);

    // El foco está dentro del diálogo, así que el evento nace en un botón y burbujea hasta el modal.
    button('No cancelar').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dismissed).toBe(1);

    (el.querySelector('.modal-content') as HTMLElement).click();
    expect(dismissed).toBe(1);

    (el.querySelector('.modal') as HTMLElement).click();
    expect(dismissed).toBe(2);
  });
});
