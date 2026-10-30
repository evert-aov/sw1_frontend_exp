import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from './button';
import { FormFieldComponent, InputDirective } from './form-field';

@Component({
  imports: [ButtonComponent, FormFieldComponent, InputDirective, ReactiveFormsModule],
  template: `<form (submit)="$event.preventDefault(); submissions = submissions + 1">
    <app-field controlId="name" label="Nombre" hint="Tu nombre" [error]="error()">
      <input appInput [formControl]="name" />
    </app-field>
    <button appButton (click)="secondaryClicks = secondaryClicks + 1">Otra acción</button>
    <button appButton type="submit" [busy]="busy()">Guardar</button>
  </form>`,
})
class FormExample {
  readonly name = new FormControl('', { nonNullable: true, validators: Validators.required });
  readonly busy = signal(false);
  readonly error = signal('');
  submissions = 0;
  secondaryClicks = 0;
}

describe('Controles compartidos y formularios nativos', () => {
  it('asocia etiqueta, ayuda y error al input sin perder Reactive Forms', async () => {
    const fixture = TestBed.createComponent(FormExample);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(fixture.nativeElement.querySelector('label').htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-describedby')).toBe('name-hint');
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.name.value).toBe('Ana');
    fixture.componentInstance.error.set('Revisa el nombre');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('name-hint name-error');
    expect(fixture.nativeElement.querySelector('#name-error').textContent).toContain(
      'Revisa el nombre',
    );
    fixture.componentInstance.error.set('');
    await fixture.whenStable();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('evita envíos accidentales y bloquea el submit durante la operación', async () => {
    const fixture = TestBed.createComponent(FormExample);
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();
    expect(fixture.componentInstance.secondaryClicks).toBe(1);
    expect(fixture.componentInstance.submissions).toBe(0);
    buttons[1].click();
    expect(fixture.componentInstance.submissions).toBe(1);
    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[1].getAttribute('aria-busy')).toBe('true');
    buttons[1].click();
    expect(fixture.componentInstance.submissions).toBe(1);
  });
});
