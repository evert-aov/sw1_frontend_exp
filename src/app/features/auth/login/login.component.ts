import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthTabsComponent } from '../auth-tabs/auth-tabs.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Componente de Inicio de Sesión (CU-01 / HU-02).
 *
 * Implementa autenticación con correo y contraseña conectándose al endpoint `/auth/login` de FastAPI.
 * Responsabilidades:
 * - Captura y validación de credenciales del usuario.
 * - Soporte para recordar sesión o usar almacenamiento de sesión.
 * - Redirección a la URL previa solicitada (`returnUrl`) o al catálogo.
 * - Presentación sin scroll adaptativa.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslatePipe, AuthTabsComponent, IconComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Estado de carga mientras se valida la autenticación */
  readonly loading = signal<boolean>(false);

  /** Visibilidad de la contraseña en texto plano */
  readonly showPassword = signal<boolean>(false);

  /** Clave de traducción para el error de autenticación */
  readonly errorKey = signal<string | null>(null);

  /** Formulario reactivo de credenciales */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  /**
   * Procesa el envío del formulario de inicio de sesión hacia FastAPI.
   *
   * @returns {void}
   */
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
        this.errorKey.set(err.status === 401 ? 'auth.login.invalid' : 'auth.serverError');
      },
    });
  }
}
