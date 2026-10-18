import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <header class="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Logo / Brand -->
        <div class="flex items-center gap-8">
          <a routerLink="/" class="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {{ 'nav.brand' | translate }}
          </a>

          <!-- Nav Links -->
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a routerLink="/catalog" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
              {{ 'nav.catalog' | translate }}
            </a>
            @if (canPublish()) {
              <a routerLink="/experiences/create" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
                {{ 'nav.createExperience' | translate }}
              </a>
            }
            <a routerLink="/demand-insights" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
              {{ 'nav.demandInsights' | translate }}
            </a>
            <a routerLink="/my-tickets" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
              {{ 'nav.myTickets' | translate }}
            </a>
          </nav>
        </div>

        <!-- Controls: Language & Theme Toggles -->
        <div class="flex items-center gap-3">
          <!-- Language Selector -->
          <button
            type="button"
            (click)="toggleLanguage()"
            class="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Cambiar idioma / Switch language"
          >
            <span>{{ i18n.currentLang() === 'es' ? '🇪🇸 ES' : '🇺🇸 EN' }}</span>
          </button>

          <!-- Theme Toggle Button -->
          <button
            type="button"
            (click)="toggleTheme()"
            class="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            [title]="themeService.isDark() ? 'Modo Claro' : 'Modo Oscuro'"
          >
            @if (themeService.isDark()) {
              <!-- Sun Icon for Light Mode -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <!-- Moon Icon for Dark Mode -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <!-- Sesión: menú de usuario o enlaces de login/registro -->
          @if (auth.currentUser(); as user) {
            <div class="relative ml-2">
              <button type="button" (click)="userMenuOpen.set(!userMenuOpen())"
                class="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                <span class="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {{ user.first_name.charAt(0).toUpperCase() }}
                </span>
                <span class="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">{{ user.first_name }}</span>
              </button>
              @if (userMenuOpen()) {
                <div class="absolute right-0 mt-2 w-48 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
                  <a routerLink="/profile" (click)="closeMenus()" class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {{ 'nav.profile' | translate }}
                  </a>
                  <button type="button" (click)="logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    {{ 'nav.logout' | translate }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/auth/login" class="hidden sm:inline ml-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-all">
              {{ 'nav.login' | translate }}
            </a>
            <a routerLink="/auth/register" class="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all">
              {{ 'nav.register' | translate }}
            </a>
          }

          <!-- Botón de menú móvil -->
          <button type="button" (click)="mobileMenuOpen.set(!mobileMenuOpen())" [attr.aria-label]="'layout.menu' | translate"
            class="md:hidden p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Menú móvil -->
      @if (mobileMenuOpen()) {
        <nav class="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col gap-3 text-sm font-medium text-slate-600 dark:text-slate-300" (click)="closeMenus()">
          <a routerLink="/catalog" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
            {{ 'nav.catalog' | translate }}
          </a>
          @if (canPublish()) {
            <a routerLink="/experiences/create" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
              {{ 'nav.createExperience' | translate }}
            </a>
          }
          <a routerLink="/demand-insights" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
            {{ 'nav.demandInsights' | translate }}
          </a>
          <a routerLink="/my-tickets" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
            {{ 'nav.myTickets' | translate }}
          </a>
        </nav>
      }
    </header>
  `,
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  i18n = inject(I18nService);
  auth = inject(AuthService);

  // HU-02: solo anfitriones, locales y admin ven "Publicar Evento"
  canPublish = computed(() => ['HOST', 'VENUE', 'ADMIN'].some((r) => this.auth.currentUser()?.roles.includes(r)));

  userMenuOpen = signal(false);
  mobileMenuOpen = signal(false);

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
