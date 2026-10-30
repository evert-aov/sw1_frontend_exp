import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon';

/** Conserva submit, foco, teclado y disabled del botón HTML. */
@Component({
  selector: 'button[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (busy()) {
      <span class="ui-spinner" aria-hidden="true"></span>
    }
    <ng-content />`,
  host: {
    class: 'ui-button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[type]': 'type()',
    '[disabled]': 'disabled() || busy()',
    '[attr.aria-busy]': 'busy() ? "true" : null',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly busy = input(false);
}

/** Un enlace conserva href/routerLink y su semántica de navegación. */
@Directive({
  selector: 'a[appButton]',
  host: { class: 'ui-button', '[attr.data-variant]': 'variant()', '[attr.data-size]': 'size()' },
})
export class ButtonLinkDirective {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
}
