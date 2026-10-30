import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, HeroIconName } from '../components/icon/icon.component';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-alert',
    '[attr.data-tone]': 'tone()',
    '[attr.role]': 'tone() === "error" ? "alert" : "status"',
  },
  template: `<app-icon
      [name]="
        tone() === 'error'
          ? 'exclamation-triangle'
          : tone() === 'success'
            ? 'check-circle'
            : 'light-bulb'
      "
    />
    <div><ng-content /></div>`,
})
export class AlertComponent {
  readonly tone = input<'info' | 'success' | 'error'>('info');
}

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-page-header' },
  template: `<div class="min-w-0">
      @if (eyebrow()) {
        <p class="ui-eyebrow">{{ eyebrow() }}</p>
      }
      <h1 class="ui-title">{{ title() }}</h1>
      @if (description()) {
        <p class="ui-description">{{ description() }}</p>
      }
    </div>
    <div class="ui-actions"><ng-content /></div>`,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly eyebrow = input('');
}

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-empty' },
  template: `<span class="ui-empty-icon"><app-icon [name]="icon()" sizeClass="w-7 h-7" /></span>
    <h2>{{ title() }}</h2>
    @if (description()) {
      <p>{{ description() }}</p>
    }
    <div class="ui-actions justify-center"><ng-content /></div>`,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input<HeroIconName>('ticket');
}

@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-badge', '[attr.data-tone]': 'tone()' },
  template: `{{ 'status.' + value() | translate }}`,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
  tone(): string {
    const value = this.value();
    if (['PAID', 'SUCCEEDED', 'CONFIRMED', 'REACHED', 'OPEN'].includes(value)) return 'success';
    if (['PENDING', 'FORMING', 'processing', 'pending', 'requires_action'].includes(value))
      return 'warning';
    if (['FAILED', 'failed', 'canceled'].includes(value)) return 'error';
    return 'neutral';
  }
}
