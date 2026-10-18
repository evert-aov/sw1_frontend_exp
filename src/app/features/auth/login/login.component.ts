import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthTabsComponent } from '../auth-tabs/auth-tabs.component';

// Inicio de sesión con JWT (CU-01 / HU-02)
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, AuthTabsComponent],
  host: { class: 'block' },
  template: `
    <p class="text-xs font-bold tracking-[0.2em] text-violet-600 dark:text-violet-400">{{ 'auth.eyebrow' | translate }}</p>
    <h2 class="mt-3 text-4xl font-extrabold tracking-tight">{{ 'auth.login.title' | translate }}</h2>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ 'auth.login.subtitle' | translate }}</p>

    <div class="mt-8"><app-auth-tabs /></div>

    @if (errorKey()) {
      <div class="mt-6 p-3 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300">
        {{ errorKey()! | translate }}
      </div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-8 space-y-6" novalidate>
      <div>
        <label for="email" class="block text-sm font-semibold">{{ 'auth.email' | translate }}</label>
        <input id="email" type="email" formControlName="email" autocomplete="email"
          [placeholder]="'auth.emailPlaceholder' | translate" [class]="inputClass" />
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <p class="mt-1 text-xs text-red-500">
            {{ (form.controls.email.hasError('required') ? 'auth.required' : 'auth.invalidEmail') | translate }}
          </p>
        }
      </div>

      <div>
        <label for="password" class="block text-sm font-semibold">{{ 'auth.password' | translate }}</label>
        <div class="relative">
          <input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="password"
            autocomplete="current-password" [placeholder]="'auth.passwordPlaceholder' | translate" [class]="inputClass + ' pr-24'" />
          <button type="button" (click)="showPassword.set(!showPassword())"
            class="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer">
            {{ (showPassword() ? 'auth.hide' : 'auth.show') | translate }}
          </button>
        </div>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p class="mt-1 text-xs text-red-500">{{ 'auth.required' | translate }}</p>
        }
      </div>

      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center gap-3 text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" formControlName="remember" class="w-4 h-4 accent-violet-600" />
          {{ 'auth.login.remember' | translate }}
        </label>
        <!-- El backend aún no tiene recuperación de contraseña: queda como enlace visual -->
        <a href="#" (click)="$event.preventDefault()" class="font-semibold text-violet-600 dark:text-violet-400 hover:underline">
          {{ 'auth.login.forgot' | translate }}
        </a>
      </div>

      <button type="submit" [disabled]="loading()" [class]="submitClass">
        {{ (loading() ? 'auth.login.loading' : 'auth.login.submit') | translate }}
        <span aria-hidden="true">→</span>
      </button>

      <p class="text-center text-xs text-slate-400 dark:text-slate-500">{{ 'auth.terms' | translate }}</p>
    </form>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  showPassword = signal(false);
  errorKey = signal<string | null>(null);

  inputClass =
    'mt-2 w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
  submitClass =
    'w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold shadow-lg shadow-violet-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorKey.set(null);

    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email, password }, remember).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/catalog';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // 401 = credenciales incorrectas; cualquier otro error = problema con el servidor
        this.errorKey.set(err.status === 401 ? 'auth.login.invalid' : 'auth.serverError');
      },
    });
  }
}
