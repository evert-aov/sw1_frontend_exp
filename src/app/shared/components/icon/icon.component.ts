import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Nombres tipados de los iconos disponibles extraídos del set oficial Heroicons v2 Outline.
 */
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

/**
 * Componente Reutilizable de Iconografía Vectorial SVG (Heroicons v2).
 *
 * Cumple con el principio de Responsabilidad Única (SRP) aislando las rutas SVG,
 * escalado dimensional y colores (`currentColor`).
 * Elimina completamente los emojis de la interfaz para una estética profesional y consistente.
 */
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
  /** Nombre del icono de Heroicons a renderizar */
  readonly name = input.required<HeroIconName>();

  /** Clases utilitarias de Tailwind para tamaño (ej. 'w-5 h-5') */
  readonly sizeClass = input<string>('w-5 h-5');
}
