import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { UserRole } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthTabsComponent } from '../auth-tabs/auth-tabs.component';

// Registro de cuenta con elección de tipo de usuario (CU-01 / HU-01)
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, AuthTabsComponent],
  host: { class: 'block' },
  template: `
    <p class="text-xs font-bold tracking-[0.2em] text-violet-600 dark:text-violet-400">{{ 'auth.eyebrow' | translate }}</p>
    <h2 class="mt-3 text-4xl font-extrabold tracking-tight">{{ 'auth.register.title' | translate }}</h2>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ 'auth.register.subtitle' | translate }}</p>

    <div class="mt-8"><app-auth-tabs /></div>

    @if (errorMessage()) {
      <div class="mt-6 p-3 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300">
        {{ errorMessage() }}
      </div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-8 space-y-5" novalidate>
      <div>
        <label for="fullName" class="block text-sm font-semibold">{{ 'auth.register.fullName' | translate }}</label>
        <input id="fullName" formControlName="fullName" autocomplete="name"
          [placeholder]="'auth.register.fullNamePlaceholder' | translate" [class]="inputClass" />
        @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
          <p class="mt-1 text-xs text-red-500">{{ 'auth.required' | translate }}</p>
        }
      </div>

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
            autocomplete="new-password" [placeholder]="'auth.passwordPlaceholder' | translate" [class]="inputClass + ' pr-24'" />
          <button type="button" (click)="showPassword.set(!showPassword())"
            class="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer">
            {{ (showPassword() ? 'auth.hide' : 'auth.show') | translate }}
          </button>
        </div>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p class="mt-1 text-xs text-red-500">
            {{ (form.controls.password.hasError('required') ? 'auth.required' : 'auth.register.minPassword') | translate }}
          </p>
        }
      </div>

      <!-- Tipo de cuenta: se envía como "role" al backend -->
      <div>
        <p class="text-sm font-semibold">{{ 'auth.register.roleQuestion' | translate }}</p>
        <div class="mt-2 grid grid-cols-2 gap-3">
          @for (option of roleOptions; track option.value) {
            <button type="button" (click)="role.set(option.value)"
              class="p-4 rounded-xl border text-left transition-colors cursor-pointer"
              [class]="role() === option.value
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                : 'border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/40'">
              <span class="flex w-4 h-4 rounded-full border-2 items-center justify-center"
                [class]="role() === option.value ? 'border-violet-500' : 'border-slate-400'">
                @if (role() === option.value) {
                  <span class="w-2 h-2 rounded-full bg-violet-500"></span>
                }
              </span>
              <span class="mt-3 block text-sm font-semibold">{{ option.labelKey | translate }}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400">{{ option.descKey | translate }}</span>
            </button>
          }
        </div>
      </div>

      <button type="submit" [disabled]="loading()" [class]="submitClass">
        {{ (loading() ? 'auth.register.loading' : 'auth.register.submit') | translate }}
        <span aria-hidden="true">→</span>
      </button>

      <p class="text-center text-xs text-slate-400 dark:text-slate-500">{{ 'auth.terms' | translate }}</p>
    </form>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private i18n = inject(I18nService);
  private router = inject(Router);

  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  role = signal<UserRole>('ATTENDEE');

  roleOptions: { value: UserRole; labelKey: string; descKey: string }[] = [
    { value: 'ATTENDEE', labelKey: 'auth.register.roleAttendee', descKey: 'auth.register.roleAttendeeDesc' },
    { value: 'HOST', labelKey: 'auth.register.roleHost', descKey: 'auth.register.roleHostDesc' },
  ];

  inputClass =
    'mt-2 w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
  submitClass =
    'w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold shadow-lg shadow-violet-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer';

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    // El diseño pide "Nombre completo" pero el backend espera nombre y apellido por separado
    const { fullName, email, password } = this.form.getRawValue();
    const [firstName, ...rest] = fullName.trim().split(/\s+/);

    this.auth
      .register({ first_name: firstName, last_name: rest.join(' ') || undefined, email, password, role: this.role() })
      .subscribe({
        next: () => this.router.navigate(['/profile']),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          // El backend responde 400 con "detail" cuando el correo ya está registrado
          const detail = typeof err.error?.detail === 'string' ? err.error.detail : null;
          this.errorMessage.set(detail ?? this.i18n.translate('auth.serverError'));
        },
      });
  }
}
