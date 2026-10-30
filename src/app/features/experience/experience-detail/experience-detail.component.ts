import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import { AlertComponent } from '../../../shared/ui/feedback';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExperienceService } from '../../../core/services/experience.service';
import { BookingService } from '../../../core/services/booking.service';
import { MatchingService } from '../../../core/services/matching.service';
import { AuthService } from '../../../core/services/auth.service';
import { Experience } from '../../../core/models/experience.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Componente de Ficha Detallada de Experiencia (CU-04 / HU-06).
 *
 * Muestra el perfil integral del evento:
 * - Portada, anfitrión, categoría, fecha, duración y ubicación / link virtual.
 * - Monitoreo de cupos reservados vs. aforo mínimo viable (quórum).
 * - Acciones de compra directa de entrada o postulación a grupo de matching para alcanzar quórum.
 * - Mensajes amigables cuando se requiere inicio de sesión.
 */
@Component({
  selector: 'app-experience-detail',
  imports: [
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    DatePipe,
    DecimalPipe,
    RouterModule,
    TranslatePipe,
    IconComponent,
    FormsModule,
  ],
  templateUrl: './experience-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceService = inject(ExperienceService);
  private readonly bookingService = inject(BookingService);
  private readonly matchingService = inject(MatchingService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  /** Entidad de la experiencia cargada */
  readonly experience = signal<Experience | null>(null);

  /** Estado de carga mientras se consulta la API */
  readonly loading = signal<boolean>(true);

  /** Bandera de error al obtener la experiencia */
  readonly error = signal<boolean>(false);

  /** Muestra aviso amigable si el usuario requiere autenticarse */
  readonly showAuthNotice = signal<boolean>(false);
  readonly reserveError = signal('');
  readonly reserving = signal(false);
  quantity = 1;
  private bookingKey = crypto.randomUUID();

  /**
   * Ciclo de vida inicial: extrae el ID de la URL y consulta el detalle al backend.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    this.experienceService.getExperienceById(id).subscribe({
      next: (exp) => {
        this.experience.set(exp);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /**
   * Inicia el proceso de compra de entrada para la experiencia.
   * Si no hay sesión activa, muestra una notificación amigable para ingresar.
   *
   * @returns {void}
   */
  onReserveClick(): void {
    const exp = this.experience();
    if (!exp || this.reserving()) return;
    if (!Number.isInteger(this.quantity) || this.quantity < 1 || this.quantity > 20) {
      this.reserveError.set(this.i18n.translate('detail.quantityError'));
      return;
    }

    if (!this.auth.isLoggedIn()) {
      this.showAuthNotice.set(true);
      return;
    }

    this.reserving.set(true);
    this.reserveError.set('');
    this.bookingService
      .createBooking({ experience_id: exp.id, quantity: this.quantity }, this.bookingKey)
      .subscribe({
        next: (booking) => {
          this.reserving.set(false);
          this.bookingKey = crypto.randomUUID();
          this.router.navigate(['/checkout', booking.id]);
        },
        error: (err) => {
          this.reserving.set(false);
          this.reserveError.set(err.error?.detail ?? this.i18n.translate('detail.reserveError'));
        },
      });
  }

  /**
   * Postula al usuario al grupo de matching dinámico para consolidar el quórum.
   *
   * @returns {void}
   */
  onJoinMatchingClick(): void {
    const exp = this.experience();
    if (!exp) return;

    if (!this.auth.isLoggedIn()) {
      this.showAuthNotice.set(true);
      return;
    }

    this.router.navigate(['/matching', exp.id]);
  }
}
