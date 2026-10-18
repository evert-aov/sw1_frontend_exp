import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, HeroIconName } from '../../../shared/components/icon/icon.component';

/**
 * Característica destacada en el panel de marca de autenticación.
 */
interface BrandFeature {
  icon: HeroIconName;
  titleKey: string;
  descKey: string;
}

/**
 * Componente de Diseño Base para la Autenticación (CU-01).
 *
 * Implementa el layout en dos paneles (Panel de marca visual + Formulario de autenticación)
 * con diseño 100% responsivo y sin barra de desplazamiento (zero-scroll) ocupando `h-dvh`.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe, IconComponent],
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  /** Características de valor mostradas en el panel de marca */
  readonly features: BrandFeature[] = [
    {
      icon: 'users',
      titleKey: 'auth.brand.feat1Title',
      descKey: 'auth.brand.feat1Desc',
    },
    {
      icon: 'shield-check',
      titleKey: 'auth.brand.feat2Title',
      descKey: 'auth.brand.feat2Desc',
    },
    {
      icon: 'chart-bar',
      titleKey: 'auth.brand.feat3Title',
      descKey: 'auth.brand.feat3Desc',
    },
  ];
}
