import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

// Pestañas "Iniciar sesión / Crear cuenta": cada una es un enlace a su ruta
@Component({
  selector: 'app-auth-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="grid grid-cols-2 gap-1 p-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
      <a routerLink="/auth/login" routerLinkActive="active" [class]="tabClass">{{ 'auth.tabs.login' | translate }}</a>
      <a routerLink="/auth/register" routerLinkActive="active" [class]="tabClass">{{ 'auth.tabs.register' | translate }}</a>
    </nav>
  `,
  styles: `
    .active {
      background-color: rgb(148 163 184 / 0.18);
      color: inherit;
    }
  `,
})
export class AuthTabsComponent {
  tabClass =
    'py-3 rounded-xl text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors';
}
