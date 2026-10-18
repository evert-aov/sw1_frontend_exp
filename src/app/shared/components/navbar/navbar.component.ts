import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/**
 * Componente de Navegación Principal (Appbar).
 *
 * Mantiene posición fija en la parte superior del viewport y proporciona:
 * - Acceso a Catálogo, Publicación de Experiencias y herramientas operativas.
 * - Conmutación de tema visual (Claro / Oscuro).
 * - Conmutación de idioma (Español / Inglés).
 * - Menú desplegable de usuario y navegación adaptativa móvil.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterModule, TranslatePipe, IconComponent],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  /** Estado del menú flotante de usuario */
  readonly userMenuOpen = signal<boolean>(false);

  /** Estado del menú desplegable para dispositivos móviles */
  readonly mobileMenuOpen = signal<boolean>(false);

  /** Iniciales calculadas del usuario autenticado */
  readonly userInitials = computed<string>(() => {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  });

  /**
   * Alterna entre modo claro y oscuro.
   *
   * @returns {void}
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Alterna entre los idiomas soportados (Español e Inglés).
   *
   * @returns {void}
   */
  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  /**
   * Cierra todos los menús desplegables activos.
   *
   * @returns {void}
   */
  closeMenus(): void {
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  /**
   * Cierra la sesión activa del usuario y limpia los estados.
   *
   * @returns {void}
   */
  logout(): void {
    this.closeMenus();
    this.auth.logout();
  }
}
