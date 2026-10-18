import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type HeroIconName =
  | 'sparkles'
  | 'calendar'
  | 'clock'
  | 'map-pin'
  | 'video-camera'
  | 'globe-alt'
  | 'building-office'
  | 'magnifying-glass'
  | 'check'
  | 'check-circle'
  | 'exclamation-triangle'
  | 'arrow-right'
  | 'arrow-left'
  | 'user'
  | 'credit-card'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'language'
  | 'bars-3'
  | 'x-mark'
  | 'plus'
  | 'chart-bar'
  | 'light-bulb'
  | 'bolt'
  | 'ticket'
  | 'shield-check'
  | 'photo'
  | 'users'
  | 'currency-dollar'
  | 'adjustments-horizontal'
  | 'eye'
  | 'eye-slash';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center justify-center shrink-0',
  },
})
export class IconComponent {
  readonly name = input.required<HeroIconName>();
  readonly sizeClass = input<string>('w-5 h-5');
}
