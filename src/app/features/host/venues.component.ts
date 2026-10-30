import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ExperienceService } from '../../core/services/experience.service';
import { Venue } from '../../core/models/venue.model';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  ButtonComponent,
  FormFieldComponent,
  InputDirective,
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-venues',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './venues.component.html',
})
export class VenuesComponent implements OnInit {
  private readonly api = inject(ExperienceService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(I18nService);
  readonly items = signal<Venue[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly editingId = signal<string | null>(null);
  readonly saved = signal(false);
  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      address: ['', [Validators.required, Validators.maxLength(255)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      zone: ['', Validators.maxLength(100)],
      phone: ['', Validators.maxLength(20)],
      max_capacity: [50, [Validators.required, Validators.min(1), Validators.max(50000)]],
      latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
      longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    },
    {
      validators: (control) =>
        (control.get('latitude')?.value === null) !== (control.get('longitude')?.value === null)
          ? { coordinates: true }
          : null,
    },
  );
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getMyVenues()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set(this.i18n.translate('venue.loadError')),
      });
  }
  edit(item: Venue): void {
    this.editingId.set(item.id);
    this.saved.set(false);
    this.error.set('');
    this.form.reset({
      name: item.name,
      address: item.address ?? '',
      city: item.city,
      zone: item.zone ?? '',
      phone: item.phone ?? '',
      max_capacity: item.max_capacity,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
    });
    document.getElementById('venue-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  newVenue(): void {
    this.editingId.set(null);
    this.saved.set(false);
    this.form.reset();
  }
  fieldError(name: string): string {
    const control = this.form.get(name);
    return control?.touched && control.invalid ? this.i18n.translate('venue.fieldError') : '';
  }
  save(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    this.api
      .saveVenue(this.form.getRawValue(), this.editingId() ?? undefined)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (item) => {
          this.items.update((items) => [...items.filter((row) => row.id !== item.id), item]);
          this.editingId.set(item.id);
          this.saved.set(true);
        },
        error: (err) => this.error.set(err.error?.detail ?? this.i18n.translate('venue.saveError')),
      });
  }
}
