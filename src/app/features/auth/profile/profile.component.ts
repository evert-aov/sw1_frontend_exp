import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { ExperienceService } from '../../../core/services/experience.service';
import { User } from '../../../core/models/user.model';
import { Category } from '../../../core/models/category.model';
import { Booking } from '../../../core/models/booking.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import {
  AlertComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  StatusBadgeComponent,
} from '../../../shared/ui/feedback';

/**
 * Pestañas disponibles en el centro de perfil.
 */
export type ProfileTab = 'profile' | 'billing';

/**
 * Componente del Perfil de Usuario y Preferencias (CU-02 / HU-03).
 *
 * Responsabilidades:
 * - Edición de datos personales (nombre, teléfono, ciudad, zona urbana, avatar, bio).
 * - Selección e inserción dinámica de intereses temáticos para recomendaciones de matching.
 * - Consulta del historial de reservas y compras de entradas.
 * - Alta Cohesión separando la vista (.html) de la lógica (.ts).
 */
@Component({
  selector: 'app-profile',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    RouterLink,
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly bookingService = inject(BookingService);
  private readonly experienceService = inject(ExperienceService);

  /** Pestaña activa ('profile' | 'billing') */
  readonly activeTab = signal<ProfileTab>('profile');

  /** Controla la visibilidad del campo de URL de avatar */
  readonly showAvatarInput = signal<boolean>(false);

  /** Entidad del usuario autenticado en sesión */
  readonly user = signal<User | null>(this.auth.currentUser());

  /** Categorías obtenidas de FastAPI para sugerencias de intereses */
  readonly categories = signal<Category[]>([]);

  /** Historial de reservas adquiridas por el usuario */
  readonly bookings = signal<Booking[]>([]);

  /** Lista reactiva de intereses temáticos del usuario */
  readonly interests = signal<string[]>([]);

  /** Estado de guardado en curso */
  readonly saving = signal<boolean>(false);

  /** Bandera indicadora de proceso de cambio de rol */

  /** Mensaje de éxito de cambio de rol */

  /** Bandera indicadora de guardado exitoso */
  readonly saved = signal<boolean>(false);

  /** Bandera indicadora de error de carga inicial */
  readonly loadError = signal<boolean>(false);
  readonly saveError = signal(false);
  readonly historyLoading = signal(true);
  readonly historyError = signal(false);

  /** Iniciales del usuario para renderizado del avatar */
  readonly userInitials = computed<string>(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  });

  /** Lista estandarizada de temas e intereses por defecto para matching y afinidad */
  private static readonly DEFAULT_TOPICS: readonly string[] = [
    'Gastronomía',
    'Café de especialidad',
    'Cata y Maridaje',
    'Arte y Pintura',
    'Música y Conciertos',
    'Música en vivo',
    'DJ y Electrónica',
    'Talleres y Educación',
    'Tecnología y Software',
    'Networking y Negocios',
    'Bienestar y Outdoors',
    'Yoga y Mindfulness',
    'Diseño UI/UX',
    'Fotografía',
  ];

  /** Lista unificada de temas e intereses disponibles para selección */
  readonly availableTopics = computed<string[]>(() => {
    const fromBackend = this.categories().map((c) => c.name);
    const current = this.interests();
    return Array.from(
      new Set([...ProfileComponent.DEFAULT_TOPICS, ...fromBackend, ...current]),
    );
  });

  /** Formulario reactivo para la edición de perfil */
  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.pattern(/\S/)]],
    last_name: [''],
    phone: [''],
    avatar_url: [''],
    bio: [''],
  });

  /**
   * Inicialización: precarga los datos en caché y sincroniza con los endpoints `/users/me`, `/categories` y `/bookings/me`.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    const cached = this.user();
    if (cached) {
      this.fillForm(cached);
    }

    this.auth.getProfile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.fillForm(u);
      },
      error: () => {
        if (!this.user()) {
          this.loadError.set(true);
        }
      },
    });

    this.experienceService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });

    if (this.auth.isAttendee())
      this.bookingService.getMyTickets().subscribe({
        next: (items) => {
          this.bookings.set(items);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyError.set(true);
          this.historyLoading.set(false);
        },
      });
  }

  /**
   * Cambia la pestaña activa en la vista de perfil.
   *
   * @param {ProfileTab} tab - Pestaña seleccionada.
   * @returns {void}
   */
  selectTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Verifica si un tema de interés está actualmente seleccionado.
   *
   * @param {string} topic - Nombre del tema.
   * @returns {boolean} True si el tema se encuentra en la lista de intereses.
   */
  isInterestSelected(topic: string): boolean {
    return this.interests().includes(topic);
  }

  /**
   * Alterna la inclusión o exclusión de un tema de interés en el perfil.
   *
   * @param {string} topic - Nombre del tema a conmutar.
   * @returns {void}
   */
  toggleInterest(topic: string): void {
    this.saved.set(false);
    this.interests.update((list) =>
      list.includes(topic) ? list.filter((t) => t !== topic) : [...list, topic],
    );
  }

  /**
   * Agrega un nuevo tema de interés personalizado escrito por el usuario.
   *
   * @param {HTMLInputElement} input - Elemento input de texto del DOM.
   * @returns {void}
   */
  addCustomInterest(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.interests().includes(value)) {
      this.saved.set(false);
      this.interests.update((list) => [...list, value]);
    }
    input.value = '';
  }

  /**
   * Cambia el rol de la cuenta entre Asistente y Anfitrión.
   *
   * @param {'HOST' | 'ATTENDEE'} targetRole - Rol de destino.
   * @returns {void}
   */

  /**
   * Guarda los cambios del perfil comunicándose con el endpoint `/users/me` de FastAPI.
   *
   * @returns {void}
   */
  onSaveProfile(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(false);

    this.auth
      .updateProfile({
        ...this.form.getRawValue(),
        interests: this.interests(),
      })
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.saving.set(false);
          this.saved.set(true);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set(true);
        },
      });
  }

  /**
   * Carga los valores de un usuario en los controles del formulario reactivo.
   *
   * @private
   * @param {User} u - Entidad del usuario a volcar.
   * @returns {void}
   */
  private fillForm(u: User): void {
    this.form.patchValue({
      first_name: u.first_name,
      last_name: u.last_name ?? '',
      phone: u.phone ?? '',
      avatar_url: u.avatar_url ?? '',
      bio: u.bio ?? '',
    });
    this.interests.set([...(u.interests ?? [])]);
  }
}
