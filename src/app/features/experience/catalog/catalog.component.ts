import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExperienceService } from '../../../core/services/experience.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Category, Experience, Modality } from '../../../core/models/models';

@Component({
  selector: 'app-catalog',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterModule, TranslatePipe, IconComponent],
  templateUrl: './catalog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly experienceService = inject(ExperienceService);

  readonly categories = signal<Category[]>([]);
  readonly allExperiences = signal<Experience[]>([]);
  readonly loading = signal<boolean>(true);
  readonly backendError = signal<boolean>(false);

  readonly selectedCategoryId = signal<number>(0);
  readonly selectedModality = signal<Modality | ''>('');

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    zone: [''],
    onlyOpen: [false],
  });

  private readonly filterValues = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.getRawValue(),
  });

  readonly filteredExperiences = computed<Experience[]>(() => {
    const catId = this.selectedCategoryId();
    const mod = this.selectedModality();
    const { search, zone, onlyOpen } = this.filterValues();

    let items = this.allExperiences();

    if (catId > 0) {
      items = items.filter((exp) => exp.category_id === catId);
    }

    if (mod) {
      items = items.filter((exp) => exp.modality === mod);
    }

    if (onlyOpen) {
      items = items.filter((exp) => exp.reserved_slots < exp.max_capacity && exp.status !== 'CANCELLED');
    }

    if (zone && zone.trim()) {
      const z = zone.toLowerCase().trim();
      items = items.filter(
        (exp) =>
          (exp.zone && exp.zone.toLowerCase().includes(z)) ||
          (exp.venue_name && exp.venue_name.toLowerCase().includes(z))
      );
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (exp) =>
          exp.title.toLowerCase().includes(q) ||
          exp.description.toLowerCase().includes(q) ||
          (exp.category_name && exp.category_name.toLowerCase().includes(q)) ||
          (exp.venue_name && exp.venue_name.toLowerCase().includes(q))
      );
    }

    return items;
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadCatalog();
  }

  loadCategories(): void {
    this.experienceService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });
  }

  loadCatalog(): void {
    this.loading.set(true);
    this.backendError.set(false);

    this.experienceService.getCatalog().subscribe({
      next: (res) => {
        this.allExperiences.set(res.experiences ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.allExperiences.set([]);
        this.loading.set(false);
        this.backendError.set(true);
      },
    });
  }

  selectCategory(id: number): void {
    this.selectedCategoryId.set(id);
  }

  selectModality(modality: Modality | ''): void {
    this.selectedModality.set(modality);
  }

  quorumProgressPercent(exp: Experience): number {
    const target = exp.max_capacity > 0 ? exp.max_capacity : exp.min_capacity || 1;
    return Math.min(100, Math.round((exp.reserved_slots / target) * 100));
  }

  isQuorumMet(exp: Experience): boolean {
    return exp.is_quorum_reached || exp.reserved_slots >= exp.min_capacity;
  }
}
