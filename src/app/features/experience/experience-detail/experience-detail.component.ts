import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
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
  imports: [DatePipe, DecimalPipe, RouterModule, TranslatePipe, IconComponent],
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

  /** Entidad de la experiencia cargada */
  readonly experience = signal<Experience | null>(null);

  /** Estado de carga mientras se consulta la API */
  readonly loading = signal<boolean>(true);

  /** Bandera de error al obtener la experiencia */
  readonly error = signal<boolean>(false);

  /** Muestra aviso amigable si el usuario requiere autenticarse */
  readonly showAuthNotice = signal<boolean>(false);

  /**
   * Ciclo de vida inicial: extrae el ID de la URL y consulta el detalle al backend.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
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
    if (!exp) return;

    if (!this.auth.isLoggedIn()) {
      this.showAuthNotice.set(true);
      return;
    }

    this.bookingService.createBooking({ experience_id: exp.id, quantity: 1 }).subscribe({
      next: (booking) => {
        this.router.navigate(['/checkout', booking.id]);
      },
      error: () => {
        this.showAuthNotice.set(true);
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

    this.matchingService.applyForMatching(exp.id).subscribe({
      next: () => {
        this.router.navigate(['/matching', exp.id]);
      },
      error: () => {
        this.showAuthNotice.set(true);
      },
    });
  }
}
