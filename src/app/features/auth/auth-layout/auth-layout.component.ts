import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

// Pantalla dividida de autenticación: marca a la izquierda, formulario (login o registro) a la derecha
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, TranslatePipe],
  template: `
    <div class="auth-font min-h-screen grid lg:grid-cols-2 bg-[#f3f1f8] dark:bg-[#0c0b12] text-slate-900 dark:text-white">
      <!-- Columna izquierda: presentación de la marca -->
      <section class="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden border-r border-slate-200 dark:border-white/10">
        <!-- Brillo violeta de fondo -->
        <div class="pointer-events-none absolute -left-40 top-1/3 w-[640px] h-[640px] rounded-full bg-violet-400/25 dark:bg-violet-700/25 blur-3xl"></div>

        <div class="relative">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center">E</span>
            <span class="font-bold tracking-[0.25em]">EXPERIENCIA</span>
          </div>
          <span class="mt-10 inline-block px-4 py-1.5 rounded-full border border-violet-300 dark:border-violet-500/40 bg-violet-100/60 dark:bg-violet-500/10 text-[11px] font-bold tracking-wider text-violet-600 dark:text-violet-300">
            {{ 'auth.brand.pill' | translate }}
          </span>
          <p class="mt-2 text-xs font-bold tracking-[0.2em] text-violet-600 dark:text-violet-400">
            {{ 'auth.brand.tagline' | translate }}
          </p>
        </div>

        <div class="relative">
          <h1 class="text-6xl font-extrabold leading-[1.05] tracking-tight">{{ 'auth.brand.title' | translate }}</h1>
          <p class="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-400">{{ 'auth.brand.subtitle' | translate }}</p>
        </div>

        <div class="relative grid grid-cols-3 gap-4">
          @for (stat of stats; track stat.value) {
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03]">
              <p class="text-2xl font-bold">{{ stat.value }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ stat.labelKey | translate }}</p>
            </div>
          }
        </div>
      </section>

      <!-- Columna derecha: aquí se carga login o registro según la ruta -->
      <section class="flex items-center justify-center p-6 sm:p-12">
        <div class="w-full max-w-[550px]">
          <router-outlet />
        </div>
      </section>
    </div>
  `,
  styles: `
    .auth-font {
      font-family: 'Manrope', system-ui, sans-serif;
    }
  `,
})
export class AuthLayoutComponent {
  stats = [
    { value: '+12K', labelKey: 'auth.brand.statAttendees' },
    { value: '94%', labelKey: 'auth.brand.statViable' },
    { value: '0', labelKey: 'auth.brand.statBiometric' },
  ];
}
