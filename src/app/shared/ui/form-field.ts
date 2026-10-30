import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  contentChild,
  effect,
  inject,
  input,
} from '@angular/core';

/** Estiliza el control nativo sin reemplazar los value accessors de Angular Forms. */
@Directive({
  selector: 'input[appInput], textarea[appInput], select[appInput]',
  host: { class: 'ui-input' },
})
export class InputDirective {
  readonly element =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>(ElementRef);
}

@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-field' },
  template: `
    <label class="ui-label" [for]="controlId()">{{ label() }}</label>
    <ng-content />
    @if (hint()) {
      <p class="ui-hint" [id]="controlId() + '-hint'">{{ hint() }}</p>
    }
    @if (error()) {
      <p class="ui-field-error" [id]="controlId() + '-error'" role="alert">{{ error() }}</p>
    }
  `,
})
export class FormFieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input('');
  private readonly control = contentChild(InputDirective);

  constructor() {
    effect(() => {
      const element = this.control()?.element.nativeElement;
      if (!element) return;
      element.id = this.controlId();
      const descriptions = [
        this.hint() ? `${this.controlId()}-hint` : '',
        this.error() ? `${this.controlId()}-error` : '',
      ].filter(Boolean);
      if (descriptions.length) element.setAttribute('aria-describedby', descriptions.join(' '));
      else element.removeAttribute('aria-describedby');
      if (this.error()) element.setAttribute('aria-invalid', 'true');
      else element.removeAttribute('aria-invalid');
    });
  }
}
