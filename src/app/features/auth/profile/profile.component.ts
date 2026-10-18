import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, TranslatePipe, IconComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
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

  /** Bandera indicadora de guardado exitoso */
  readonly saved = signal<boolean>(false);

  /** Bandera indicadora de error de carga inicial */
  readonly loadError = signal<boolean>(false);

  /** Iniciales del usuario para renderizado del avatar */
  readonly userInitials = computed<string>(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  });

  /** Lista unificada de temas e intereses disponibles para selección */
  readonly availableTopics = computed<string[]>(() => {
    const fromBackend = this.categories().map((c) => c.name);
    const current = this.interests();
    return Array.from(new Set([...fromBackend, ...current]));
  });

  /** Formulario reactivo para la edición de perfil */
  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    phone: [''],
    city: [''],
    zone: [''],
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

    this.bookingService.getMyTickets().subscribe({
      next: (items) => this.bookings.set(items),
      error: () => this.bookings.set([]),
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
    this.interests.update((list) =>
      list.includes(topic) ? list.filter((t) => t !== topic) : [...list, topic]
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
      this.interests.update((list) => [...list, value]);
    }
    input.value = '';
  }

  /**
   * Guarda los cambios del perfil comunicándose con el endpoint `/users/me` de FastAPI.
   *
   * @returns {void}
   */
  onSaveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saved.set(false);

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
      city: u.city ?? '',
      zone: u.zone ?? '',
      avatar_url: u.avatar_url ?? '',
      bio: u.bio ?? '',
    });
    this.interests.set([...(u.interests ?? [])]);
  }
}
