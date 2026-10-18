import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

/**
 * Componente de Selector de Pestañas de Autenticación (Login / Registro).
 *
 * Responsabilidad: Permitir la conmutación fluida entre inicio de sesión y creación de cuenta.
 */
@Component({
  selector: 'app-auth-tabs',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './auth-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthTabsComponent {}
