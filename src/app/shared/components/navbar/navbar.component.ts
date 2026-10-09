import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../core/services/i18n.service';
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
            <a routerLink="/experiences/create" routerLinkActive="text-indigo-600 dark:text-indigo-400" class="hover:text-indigo-500 transition-colors">
              {{ 'nav.createExperience' | translate }}
            </a>
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

          <!-- User Profile / Auth Link -->
          <a
            routerLink="/auth/login"
            class="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
          >
            {{ 'nav.login' | translate }}
          </a>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  i18n = inject(I18nService);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }
}
