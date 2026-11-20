import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import { AlertComponent } from '../../../shared/ui/feedback';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ExperienceService } from '../../../core/services/experience.service';
import { BookingService } from '../../../core/services/booking.service';
import { MatchingService } from '../../../core/services/matching.service';
import { AuthService } from '../../../core/services/auth.service';
import { Experience } from '../../../core/models/experience.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

const FALLBACK_DETAIL_IMAGES = [
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1800&q=85',
];

/**
 * Componente de Ficha Detallada de Experiencia (CU-04 / HU-06).
 * Rediseñado con Estilo Editorial / Revista (Magazine).
 */
@Component({
  selector: 'app-experience-detail',
  imports: [
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
  styleUrl: './experience-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceService = inject(ExperienceService);
  private readonly bookingService = inject(BookingService);
  private readonly matchingService = inject(MatchingService);
  private readonly sanitizer = inject(DomSanitizer);
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
  readonly startingEvent = signal(false);
  quantity = 1;
  private bookingKey = crypto.randomUUID();

  /** Imagen curada o portada oficial */
  readonly displayImage = computed<string>(() => {
    const exp = this.experience();
    if (exp?.cover_image_url?.trim()) {
      return exp.cover_image_url.trim();
    }
    return FALLBACK_DETAIL_IMAGES[0];
  });

  /** URL segura para previsualización de mapa con OpenStreetMap */
  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const exp = this.experience();
    if (!exp) return null;
    const query = [exp.venue_address, exp.venue_name, exp.venue_zone, 'La Paz, Bolivia']
      .filter(Boolean)
      .join(', ');
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=-68.18,-16.55,-68.08,-16.48&layer=mapnik&marker=-16.535,-68.085`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  /** Enlace directo externo a OpenStreetMap */
  readonly externalMapUrl = computed<string>(() => {
    const exp = this.experience();
    if (!exp) return 'https://www.openstreetmap.org';
    const query = encodeURIComponent(
      [exp.venue_address, exp.venue_name, exp.venue_zone, 'La Paz, Bolivia']
        .filter(Boolean)
        .join(', '),
    );
    return `https://www.openstreetmap.org/search?query=${query}`;
  });

  /** Quórum alcanzado o en progreso */
  readonly quorumPercent = computed<number>(() => {
    const exp = this.experience();
    if (!exp) return 0;
    return Math.min(
      100,
      Math.round((100 * exp.reserved_slots) / Math.max(1, exp.min_capacity)),
    );
  });

  onStartEvent(): void {
    const exp = this.experience();
    if (!exp || this.startingEvent()) return;
    this.startingEvent.set(true);
    this.reserveError.set('');
    this.experienceService.startExperience(exp.id).subscribe({
      next: (updated) => {
        this.experience.set(updated);
        this.startingEvent.set(false);
        void this.router.navigate(['/live', exp.id]);
      },
      error: (err) => {
        this.startingEvent.set(false);
        this.reserveError.set(err.error?.detail ?? this.i18n.translate('host.startError'));
      },
    });
  }

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
