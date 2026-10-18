import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { UserRole } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthTabsComponent } from '../auth-tabs/auth-tabs.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, TranslatePipe, AuthTabsComponent, IconComponent],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly role = signal<UserRole>('ATTENDEE');

  readonly roleOptions: { value: UserRole; labelKey: string; descKey: string }[] = [
    { value: 'ATTENDEE', labelKey: 'auth.register.roleAttendee', descKey: 'auth.register.roleAttendeeDesc' },
    { value: 'HOST', labelKey: 'auth.register.roleHost', descKey: 'auth.register.roleHostDesc' },
  ];

  readonly form = this.fb.nonNullable.group({
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

    const { fullName, email, password } = this.form.getRawValue();
    const [firstName, ...rest] = fullName.trim().split(/\s+/);

    this.auth
      .register({
        first_name: firstName,
        last_name: rest.join(' ') || undefined,
        email,
        password,
        role: this.role(),
      })
      .subscribe({
        next: () => this.router.navigate(['/profile']),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          const detail = typeof err.error?.detail === 'string' ? err.error.detail : null;
          this.errorMessage.set(detail ?? this.i18n.translate('auth.serverError'));
        },
      });
  }
}
