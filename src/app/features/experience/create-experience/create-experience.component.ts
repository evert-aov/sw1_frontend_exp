import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { InputDirective } from '../../../shared/ui/form-field';
import { AlertComponent } from '../../../shared/ui/feedback';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ExperienceService } from '../../../core/services/experience.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { getFriendlyErrorMessage } from '../../../core/utils/http-error.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, HeroIconName } from '../../../shared/components/icon/icon.component';
import { Category } from '../../../core/models/category.model';
import {
  CreateExperiencePayload,
  Experience,
  Modality,
} from '../../../core/models/experience.model';
import { Venue } from '../../../core/models/venue.model';
import { eventTimeInBolivia } from '../../../core/utils/event-time.util';

/**
 * Paso activo del asistente/wizard de publicación.
 */
export type WizardStep = 1 | 2 | 3;

/**
 * Opción de selección de modalidad con icono Heroicons.
 */
export interface ModalityOption {
  value: Modality;
  labelKey: string;
  icon: HeroIconName;
}

/**
 * Componente de publicación de experiencias (CU-03 / HU-04, HU-07).
 *
 * Implementa un wizard guiado de 3 pasos con cálculo financiero reactivo en tiempo real:
 * - Paso 1: Información básica (título, categoría, descripción, portada).
 * - Paso 2: Logística y modalidad (fecha, hora, duración, sede física o sala virtual).
 * - Paso 3: Aforo y economía (quórum mínimo viable, capacidad máxima, precio y desglose de comisiones escalonadas).
 *
 * Cumple con Alta Cohesión y Bajo Acoplamiento separando la vista externa (.html) de la lógica (.ts).
 */
@Component({
  selector: 'app-create-experience',
  imports: [
    ButtonComponent,
    ButtonLinkDirective,
    InputDirective,
    AlertComponent,
    DecimalPipe,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    IconComponent,
  ],
  templateUrl: './create-experience.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExperienceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly editId = this.route?.snapshot.paramMap?.get('id') ?? null;
  readonly editLoading = signal(false);
  readonly editAllowed = signal(!this.editId);

  private readonly fb = inject(FormBuilder);
  private readonly experienceService = inject(ExperienceService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  /** Paso actual del wizard (1, 2 o 3) */
  readonly currentStep = signal<WizardStep>(1);

  /** Categorías temáticas obtenidas en tiempo real del backend FastAPI */
  readonly categories = signal<Category[]>([]);

  /** Estado de carga de las categorías */
  readonly loadingCategories = signal<boolean>(true);

  /** Bandera indicadora de proceso de envío HTTP en curso */
  readonly isSubmitting = signal<boolean>(false);

  /** Experiencia creada satisfactoriamente */
  readonly publishedExperience = signal<Experience | null>(null);

  /** Mensaje de error amigable devuelto por la API */
  readonly submitError = signal<string | null>(null);

  /** Bandera indicadora de si se requiere inicio de sesión para publicar */
  readonly requiresAuthPrompt = signal<boolean>(false);

  /** Bandera indicadora de proceso de ascenso a rol Anfitrión */

  /** Configuración de navegación por pasos */
  readonly steps: { step: WizardStep; code: string; labelKey: string }[] = [
    { step: 1, code: '01', labelKey: 'exp.step1.nav' },
    { step: 2, code: '02', labelKey: 'exp.step2.nav' },
    { step: 3, code: '03', labelKey: 'exp.step3.nav' },
  ];

  /** Modalidades admitidas con iconos vectoriales Heroicons */
  readonly modalityOptions: ModalityOption[] = [
    { value: 'IN_PERSON', labelKey: 'exp.form.modInPerson', icon: 'map-pin' },
    { value: 'VIRTUAL', labelKey: 'exp.form.modVirtual', icon: 'video-camera' },
    { value: 'HYBRID', labelKey: 'exp.form.modHybrid', icon: 'globe-alt' },
  ];

  /** Formulario reactivo tipado para la publicación de la experiencia */
  readonly form = this.fb.nonNullable.group({
    // Paso 1: Información básica
    title: ['', [Validators.required, Validators.minLength(4)]],
    category_id: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    cover_image_url: [''],

    // Paso 2: Logística
    event_date_only: ['', Validators.required],
    event_time_only: ['20:30', Validators.required],
    duration_minutes: [120, [Validators.required, Validators.min(15), Validators.max(1440)]],
    modality: ['IN_PERSON' as Modality, Validators.required],
    venue_id: [''],
    venue_name: [''],
    zone: [''],
    address: [''],
    virtual_meeting_url: [''],

    // Paso 3: Aforo y Economía (HU-04 & HU-07)
    min_capacity: [10, [Validators.required, Validators.min(1), Validators.max(10000)]],
    max_capacity: [24, [Validators.required, Validators.min(1), Validators.max(10000)]],
    price: [290, [Validators.required, Validators.min(0)]],
  });

  /** Señal de los valores del formulario reactivo */
  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Modalidad reactiva seleccionada */
  readonly currentModality = computed<Modality>(() => {
    return (this.formValues().modality as Modality) ?? 'IN_PERSON';
  });

  /** Aforo mínimo viable numérico */
  readonly minCapacity = computed<number>(() => {
    return Math.max(0, Number(this.formValues().min_capacity) || 0);
  });

  /** Capacidad máxima numérica */
  readonly maxCapacity = computed<number>(() => {
    return Math.max(0, Number(this.formValues().max_capacity) || 0);
  });

  /** Precio numérico unitario por entrada */
  readonly currentPrice = computed<number>(() => {
    return Math.max(0, Number(this.formValues().price) || 0);
  });

  /** Bandera de validación: advierte si el cupo mínimo excede el cupo máximo */
  readonly hasCapacityConflict = computed<boolean>(() => {
    return (
      this.minCapacity() > 0 && this.maxCapacity() > 0 && this.minCapacity() > this.maxCapacity()
    );
  });

  /** Desglose de comisiones escalonadas reactivo (HU-07) */
  readonly venues = signal<Venue[]>([]);
  readonly venuesLoading = signal(false);
  readonly venueError = signal(false);
  readonly commissionError = signal(false);
  private readonly quote = toSignal(
    this.form.controls.price.valueChanges.pipe(
      startWith(this.form.controls.price.value),
      debounceTime(150),
      distinctUntilChanged(),
      tap(() => this.commissionError.set(false)),
      switchMap((price) =>
        concat(
          of(null),
          this.experienceService.getCommissionQuote(Number(price)).pipe(
            catchError(() => {
              this.commissionError.set(true);
              return of(null);
            }),
          ),
        ),
      ),
    ),
    { initialValue: null },
  );
  readonly commission = computed(() => {
    const quote = this.quote();
    return quote?.price === this.currentPrice() ? quote : null;
  });

  /** Ingresos brutos garantizados al alcanzar el quórum mínimo viable */
  readonly guaranteedGrossRevenue = computed<number>(() => {
    return this.minCapacity() * this.currentPrice();
  });

  /** Tarifa de plataforma retenida sobre el quórum mínimo */
  readonly quorumPlatformFee = computed<number>(() => {
    return (this.commission()?.feePerTicket ?? 0) * this.minCapacity();
  });

  /** Ingreso neto garantizado que recibirá el anfitrión al alcanzar el quórum */
  readonly guaranteedNetRevenue = computed<number>(() => {
    return (this.commission()?.netPerTicket ?? 0) * this.minCapacity();
  });

  /** Ingreso neto potencial en caso de agotarse todas las entradas (aforo máximo) */
  readonly maxNetRevenue = computed<number>(() => {
    return (this.commission()?.netPerTicket ?? 0) * this.maxCapacity();
  });

  /**
   * Ciclo de vida inicial del componente: preconfigura fecha sugerida y carga categorías.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    const draft = this.route?.snapshot.queryParamMap;
    const title = draft?.get('title');
    const price = Number(draft?.get('price'));
    if (title) this.form.controls.title.setValue(title.slice(0, 200));
    if (draft?.has('price') && Number.isFinite(price) && price >= 0 && price <= 10000000)
      this.form.controls.price.setValue(price);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.form.controls.event_date_only.setValue(nextWeek.toISOString().split('T')[0]);

    this.loadCategories();
    this.loadVenues();
    if (this.editId) {
      this.editLoading.set(true);
      this.experienceService.getMyExperience(this.editId).subscribe({
        next: (item) => {
          this.editLoading.set(false);
          this.editAllowed.set(item.can_edit);
          if (!item.can_edit) {
            this.submitError.set(this.i18n.translate('host.editLocked'));
            return;
          }
          const local = new Date(
            new Date(item.event_date).getTime() - 4 * 60 * 60 * 1000,
          ).toISOString();
          this.form.patchValue({
            title: item.title,
            category_id: item.category_id,
            description: item.description,
            cover_image_url: item.cover_image_url ?? '',
            modality: item.modality,
            venue_id: item.venue_id ?? '',
            event_date_only: local.slice(0, 10),
            event_time_only: local.slice(11, 16),
            duration_minutes: item.duration_minutes,
            min_capacity: item.min_capacity,
            max_capacity: item.max_capacity,
            price: item.price,
            virtual_meeting_url: item.virtual_meeting_url ?? '',
          });
          this.form.controls.category_id.disable();
          this.selectVenue();
        },
        error: () => {
          this.editLoading.set(false);
          this.submitError.set(this.i18n.translate('host.editLocked'));
        },
      });
    }
  }

  /** Carga sedes persistidas para enviar su UUID real al publicar. */
  loadVenues(): void {
    this.venueError.set(false);
    this.venuesLoading.set(true);
    this.experienceService.getMyVenues().subscribe({
      next: (venues) => {
        this.venuesLoading.set(false);
        this.venues.set(venues);
        this.selectVenue();
        const zone = this.route?.snapshot.queryParamMap.get('zone');
        const venue = zone
          ? venues.find((item) => item.zone?.toLocaleLowerCase() === zone.toLocaleLowerCase())
          : undefined;
        if (venue) {
          this.form.controls.venue_id.setValue(venue.id);
          this.selectVenue();
        }
      },
      error: () => {
        this.venuesLoading.set(false);
        this.venueError.set(true);
      },
    });
  }

  /** Muestra los datos de la sede seleccionada sin inventar una sede en el payload. */
  selectVenue(): void {
    const venue = this.venues().find((item) => item.id === this.form.controls.venue_id.value);
    this.form.patchValue({
      venue_name: venue?.name ?? '',
      zone: venue?.zone ?? '',
      address: venue?.address ?? '',
    });
  }

  /**
   * Consulta las categorías temáticas reales al servicio backend FastAPI.
   *
   * @returns {void}
   */
  loadCategories(): void {
    this.loadingCategories.set(true);
    this.experienceService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        const requested = this.route?.snapshot.queryParamMap.get('category_id');
        if (requested && cats.some((item) => item.id === requested))
          this.form.controls.category_id.setValue(requested);
        if (cats.length > 0 && !this.form.controls.category_id.value) {
          this.form.controls.category_id.setValue(cats[0].id);
        }
        this.loadingCategories.set(false);
      },
      error: () => {
        this.categories.set([]);
        this.loadingCategories.set(false);
      },
    });
  }

  /**
   * Establece la modalidad elegida para el evento (Presencial, Virtual, Híbrido).
   *
   * @param {Modality} modality - Modalidad seleccionada.
   * @returns {void}
   */
  selectModality(modality: Modality): void {
    this.form.controls.modality.setValue(modality);
  }

  /**
   * Navega a un paso específico del wizard validando previamente los pasos anteriores.
   *
   * @param {WizardStep} target - Paso al que se desea avanzar o retroceder.
   * @returns {void}
   */
  goToStep(target: WizardStep): void {
    const current = this.currentStep();
    if (target < current) {
      this.currentStep.set(target);
      return;
    }
    if (target === 2 && this.validateStep1()) {
      this.currentStep.set(2);
    } else if (target === 3 && this.validateStep1() && this.validateStep2()) {
      this.currentStep.set(3);
    }
  }

  /**
   * Avanza al siguiente paso del wizard tras verificar la validez del formulario actual.
   *
   * @returns {void}
   */
  nextStep(): void {
    const current = this.currentStep();
    if (current === 1 && this.validateStep1()) {
      this.currentStep.set(2);
    } else if (current === 2 && this.validateStep2()) {
      this.currentStep.set(3);
    }
  }

  /**
   * Retrocede un paso en el flujo del wizard.
   *
   * @returns {void}
   */
  prevStep(): void {
    const current = this.currentStep();
    if (current === 3) {
      this.currentStep.set(2);
    } else if (current === 2) {
      this.currentStep.set(1);
    }
  }

  /**
   * Procesa y envía el formulario de publicación a FastAPI.
   * Si el usuario no está autenticado, intercepta amigablemente sin mensajes técnicos
   * de cabeceras HTTP y solicita iniciar sesión.
   *
   * @returns {void}
   */
  onSubmit(): void {
    if (this.isSubmitting() || this.editLoading() || (this.editId && !this.editAllowed())) return;
    if (!this.commission() || this.commission()?.price !== this.currentPrice()) {
      this.submitError.set(this.i18n.translate('exp.quoteUnavailable'));
      return;
    }
    if (!this.auth.isLoggedIn()) {
      this.requiresAuthPrompt.set(true);
      this.submitError.set(this.i18n.translate('auth.friendlyRequiredDesc'));
      return;
    }

    if (!this.auth.canPublishExperiences()) {
      this.submitError.set(this.i18n.translate('exp.create.attendeeBlockedDesc'));
      return;
    }

    if (!this.validateStep1()) {
      this.currentStep.set(1);
      return;
    }
    if (!this.validateStep2()) {
      this.currentStep.set(2);
      return;
    }
    if (
      this.form.controls.min_capacity.invalid ||
      this.form.controls.max_capacity.invalid ||
      this.form.controls.price.invalid ||
      this.hasCapacityConflict()
    ) {
      this.form.controls.min_capacity.markAsTouched();
      this.form.controls.max_capacity.markAsTouched();
      this.form.controls.price.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.requiresAuthPrompt.set(false);
    this.publishedExperience.set(null);

    const raw = this.form.getRawValue();
    const combinedIsoDate = eventTimeInBolivia(raw.event_date_only, raw.event_time_only || '20:30');

    const payload: CreateExperiencePayload = {
      title: raw.title.trim(),
      category_id: raw.category_id,
      description: raw.description.trim(),
      cover_image_url: raw.cover_image_url.trim() || undefined,
      modality: raw.modality,
      venue_id: raw.modality !== 'VIRTUAL' ? raw.venue_id : undefined,
      virtual_meeting_url:
        raw.modality !== 'IN_PERSON' ? raw.virtual_meeting_url.trim() || undefined : undefined,
      event_date: combinedIsoDate,
      duration_minutes: Number(raw.duration_minutes),
      min_capacity: Number(raw.min_capacity),
      max_capacity: Number(raw.max_capacity),
      price: Number(raw.price),
    };

    const { category_id, ...update } = payload;
    const request = this.editId
      ? this.experienceService.updateExperience(this.editId, {
          ...update,
          cover_image_url: raw.cover_image_url.trim() || null,
          venue_id: raw.modality === 'VIRTUAL' ? null : raw.venue_id,
          virtual_meeting_url:
            raw.modality === 'IN_PERSON' ? null : raw.virtual_meeting_url.trim() || null,
        })
      : this.experienceService.createExperience(payload);
    request.subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.publishedExperience.set(created);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const parsed = getFriendlyErrorMessage(err, (k) => this.i18n.translate(k));
        this.requiresAuthPrompt.set(parsed.requiresAuth);
        this.submitError.set(parsed.message);
      },
    });
  }

  /**
   * Actualiza la cuenta del usuario de Asistente a Anfitrión para permitirle publicar experiencias.
   *
   * @returns {void}
   */

  /**
   * Valida los campos obligatorios del Paso 1 (Título, Categoría, Descripción).
   *
   * @private
   * @returns {boolean} True si el paso 1 es completamente válido.
   */
  private validateStep1(): boolean {
    const { title, category_id, description } = this.form.controls;
    title.markAsTouched();
    category_id.markAsTouched();
    description.markAsTouched();
    return title.valid && (category_id.disabled || category_id.valid) && description.valid;
  }

  /**
   * Valida los campos logísticos del Paso 2 según la modalidad seleccionada.
   *
   * @private
   * @returns {boolean} True si la logística es coherente con la modalidad.
   */
  private validateStep2(): boolean {
    const {
      event_date_only,
      event_time_only,
      duration_minutes,
      modality,
      venue_id,
      virtual_meeting_url,
    } = this.form.controls;
    event_date_only.markAsTouched();
    event_time_only.markAsTouched();
    duration_minutes.markAsTouched();

    if (
      modality.value !== 'VIRTUAL' &&
      !this.venues().some((venue) => venue.id === venue_id.value)
    ) {
      venue_id.setErrors({ required: true });
      venue_id.markAsTouched();
      return false;
    }
    if (modality.value !== 'IN_PERSON' && !virtual_meeting_url.value.trim()) {
      virtual_meeting_url.setErrors({ required: true });
      virtual_meeting_url.markAsTouched();
      return false;
    }

    return event_date_only.valid && event_time_only.valid && duration_minutes.valid;
  }
}
