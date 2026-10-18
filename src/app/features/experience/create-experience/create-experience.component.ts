import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ExperienceService, CommissionBreakdown } from '../../../core/services/experience.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { getFriendlyErrorMessage } from '../../../core/utils/http-error.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, HeroIconName } from '../../../shared/components/icon/icon.component';
import { Category } from '../../../core/models/category.model';
import { CreateExperiencePayload, Experience, Modality } from '../../../core/models/experience.model';

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
  imports: [DecimalPipe, ReactiveFormsModule, RouterModule, TranslatePipe, IconComponent],
  templateUrl: './create-experience.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExperienceComponent implements OnInit {
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
  readonly switchingToHost = signal<boolean>(false);

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
    duration_minutes: [120, [Validators.required, Validators.min(30), Validators.max(720)]],
    modality: ['IN_PERSON' as Modality, Validators.required],
    venue_name: [''],
    zone: [''],
    address: [''],
    virtual_meeting_url: [''],

    // Paso 3: Aforo y Economía (HU-04 & HU-07)
    min_capacity: [10, [Validators.required, Validators.min(2), Validators.max(500)]],
    max_capacity: [24, [Validators.required, Validators.min(2), Validators.max(1000)]],
    price: [290, [Validators.required, Validators.min(1)]],
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
    return this.minCapacity() > 0 && this.maxCapacity() > 0 && this.minCapacity() > this.maxCapacity();
  });

  /** Desglose de comisiones escalonadas reactivo (HU-07) */
  readonly commission = computed<CommissionBreakdown>(() => {
    return this.experienceService.calculateCommission(this.currentPrice());
  });

  /** Ingresos brutos garantizados al alcanzar el quórum mínimo viable */
  readonly guaranteedGrossRevenue = computed<number>(() => {
    return this.minCapacity() * this.currentPrice();
  });

  /** Tarifa de plataforma retenida sobre el quórum mínimo */
  readonly quorumPlatformFee = computed<number>(() => {
    return Math.round(this.guaranteedGrossRevenue() * this.commission().rate * 100) / 100;
  });

  /** Ingreso neto garantizado que recibirá el anfitrión al alcanzar el quórum */
  readonly guaranteedNetRevenue = computed<number>(() => {
    return Math.max(0, this.guaranteedGrossRevenue() - this.quorumPlatformFee());
  });

  /** Ingreso neto potencial en caso de agotarse todas las entradas (aforo máximo) */
  readonly maxNetRevenue = computed<number>(() => {
    const gross = this.maxCapacity() * this.currentPrice();
    return Math.max(0, Math.round(gross * (1 - this.commission().rate) * 100) / 100);
  });

  /**
   * Ciclo de vida inicial del componente: preconfigura fecha sugerida y carga categorías.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.form.controls.event_date_only.setValue(nextWeek.toISOString().split('T')[0]);

    this.loadCategories();
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
    if (!this.auth.isLoggedIn()) {
      this.requiresAuthPrompt.set(true);
      this.submitError.set(this.i18n.translate('auth.friendlyRequiredDesc'));
      return;
    }

    if (this.auth.isAttendee()) {
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
    const combinedIsoDate = new Date(`${raw.event_date_only}T${raw.event_time_only || '20:30'}:00Z`).toISOString();

    const payload: CreateExperiencePayload = {
      title: raw.title.trim(),
      category_id: raw.category_id,
      description: raw.description.trim(),
      cover_image_url: raw.cover_image_url.trim() || undefined,
      modality: raw.modality,
      venue_name: raw.modality !== 'VIRTUAL' ? raw.venue_name.trim() || undefined : undefined,
      zone: raw.modality !== 'VIRTUAL' ? raw.zone.trim() || undefined : undefined,
      address: raw.modality !== 'VIRTUAL' ? raw.address.trim() || undefined : undefined,
      virtual_meeting_url: raw.modality !== 'IN_PERSON' ? raw.virtual_meeting_url.trim() || undefined : undefined,
      event_date: combinedIsoDate,
      duration_minutes: Number(raw.duration_minutes),
      min_capacity: Number(raw.min_capacity),
      max_capacity: Number(raw.max_capacity),
      price: Number(raw.price),
    };

    this.experienceService.createExperience(payload).subscribe({
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
  onUpgradeToHost(): void {
    this.switchingToHost.set(true);
    this.auth.switchRole('HOST').subscribe({
      next: () => {
        this.switchingToHost.set(false);
        this.submitError.set(null);
      },
      error: () => {
        this.switchingToHost.set(false);
      },
    });
  }

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
    return title.valid && category_id.valid && description.valid;
  }

  /**
   * Valida los campos logísticos del Paso 2 según la modalidad seleccionada.
   *
   * @private
   * @returns {boolean} True si la logística es coherente con la modalidad.
   */
  private validateStep2(): boolean {
    const { event_date_only, event_time_only, duration_minutes, modality, address, virtual_meeting_url } =
      this.form.controls;
    event_date_only.markAsTouched();
    event_time_only.markAsTouched();
    duration_minutes.markAsTouched();

    if (modality.value !== 'VIRTUAL' && !address.value.trim()) {
      address.setErrors({ required: true });
      address.markAsTouched();
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
