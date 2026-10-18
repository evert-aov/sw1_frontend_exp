import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

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

  readonly userMenuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly userInitials = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  });

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  closeMenus(): void {
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.closeMenus();
    this.auth.logout();
  }
}
