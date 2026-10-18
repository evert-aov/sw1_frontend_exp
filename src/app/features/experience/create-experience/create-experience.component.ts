import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ExperienceService, CommissionBreakdown } from '../../../core/services/experience.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, HeroIconName } from '../../../shared/components/icon/icon.component';
import { Category, CreateExperiencePayload, Experience, Modality } from '../../../core/models/models';

export type WizardStep = 1 | 2 | 3;

export interface ModalityOption {
  value: Modality;
  labelKey: string;
  icon: HeroIconName;
}

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

  readonly currentStep = signal<WizardStep>(1);
  readonly categories = signal<Category[]>([]);
  readonly loadingCategories = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly publishedExperience = signal<Experience | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly steps: { step: WizardStep; code: string; labelKey: string }[] = [
    { step: 1, code: '01', labelKey: 'exp.step1.nav' },
    { step: 2, code: '02', labelKey: 'exp.step2.nav' },
    { step: 3, code: '03', labelKey: 'exp.step3.nav' },
  ];

  readonly modalityOptions: ModalityOption[] = [
    { value: 'IN_PERSON', labelKey: 'exp.form.modInPerson', icon: 'map-pin' },
    { value: 'VIRTUAL', labelKey: 'exp.form.modVirtual', icon: 'video-camera' },
    { value: 'HYBRID', labelKey: 'exp.form.modHybrid', icon: 'globe-alt' },
  ];

  readonly form = this.fb.nonNullable.group({
    // Step 1: Basic Information
    title: ['', [Validators.required, Validators.minLength(4)]],
    category_id: [0, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    cover_image_url: [''],

    // Step 2: Logistics
    event_date_only: ['', Validators.required],
    event_time_only: ['20:30', Validators.required],
    duration_minutes: [120, [Validators.required, Validators.min(30), Validators.max(720)]],
    modality: ['IN_PERSON' as Modality, Validators.required],
    venue_name: [''],
    zone: [''],
    address: [''],
    virtual_meeting_url: [''],

    // Step 3: Capacity & Economics (HU-04 & HU-07)
    min_capacity: [10, [Validators.required, Validators.min(2), Validators.max(500)]],
    max_capacity: [24, [Validators.required, Validators.min(2), Validators.max(1000)]],
    price: [290, [Validators.required, Validators.min(1)]],
  });

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly currentModality = computed<Modality>(() => {
    return (this.formValues().modality as Modality) ?? 'IN_PERSON';
  });

  readonly minCapacity = computed<number>(() => {
    return Math.max(0, Number(this.formValues().min_capacity) || 0);
  });

  readonly maxCapacity = computed<number>(() => {
    return Math.max(0, Number(this.formValues().max_capacity) || 0);
  });

  readonly currentPrice = computed<number>(() => {
    return Math.max(0, Number(this.formValues().price) || 0);
  });

  readonly hasCapacityConflict = computed<boolean>(() => {
    return this.minCapacity() > 0 && this.maxCapacity() > 0 && this.minCapacity() > this.maxCapacity();
  });

  readonly commission = computed<CommissionBreakdown>(() => {
    return this.experienceService.calculateCommission(this.currentPrice());
  });

  readonly guaranteedGrossRevenue = computed<number>(() => {
    return this.minCapacity() * this.currentPrice();
  });

  readonly quorumPlatformFee = computed<number>(() => {
    return Math.round(this.guaranteedGrossRevenue() * this.commission().rate * 100) / 100;
  });

  readonly guaranteedNetRevenue = computed<number>(() => {
    return Math.max(0, this.guaranteedGrossRevenue() - this.quorumPlatformFee());
  });

  readonly maxNetRevenue = computed<number>(() => {
    const gross = this.maxCapacity() * this.currentPrice();
    return Math.max(0, Math.round(gross * (1 - this.commission().rate) * 100) / 100);
  });

  ngOnInit(): void {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.form.controls.event_date_only.setValue(nextWeek.toISOString().split('T')[0]);

    this.loadCategories();
  }

  loadCategories(): void {
    this.loadingCategories.set(true);
    this.experienceService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        if (cats.length > 0 && this.form.controls.category_id.value === 0) {
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

  selectModality(modality: Modality): void {
    this.form.controls.modality.setValue(modality);
  }

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

  nextStep(): void {
    const current = this.currentStep();
    if (current === 1 && this.validateStep1()) {
      this.currentStep.set(2);
    } else if (current === 2 && this.validateStep2()) {
      this.currentStep.set(3);
    }
  }

  prevStep(): void {
    const current = this.currentStep();
    if (current === 3) {
      this.currentStep.set(2);
    } else if (current === 2) {
      this.currentStep.set(1);
    }
  }

  onSubmit(): void {
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
    this.publishedExperience.set(null);

    const raw = this.form.getRawValue();
    const combinedIsoDate = new Date(`${raw.event_date_only}T${raw.event_time_only || '20:30'}:00Z`).toISOString();

    const payload: CreateExperiencePayload = {
      title: raw.title.trim(),
      category_id: Number(raw.category_id),
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
        const detail = typeof err.error?.detail === 'string' ? err.error.detail : null;
        this.submitError.set(detail ?? this.i18n.translate('exp.alert.errorDefault'));
      },
    });
  }

  private validateStep1(): boolean {
    const { title, category_id, description } = this.form.controls;
    title.markAsTouched();
    category_id.markAsTouched();
    description.markAsTouched();
    return title.valid && category_id.valid && description.valid;
  }

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
