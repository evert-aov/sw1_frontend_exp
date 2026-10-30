import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import { FormFieldComponent, InputDirective } from '../../../shared/ui/form-field';
import {
  AlertComponent,
  EmptyStateComponent,
  PageHeaderComponent,
} from '../../../shared/ui/feedback';
import { I18nService } from '../../../core/services/i18n.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, startWith, Subject, switchMap } from 'rxjs';
import { ExperienceService } from '../../../core/services/experience.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { EventSkeletonComponent } from '../../../shared/components/event-skeleton/event-skeleton.component';
import { Category } from '../../../core/models/category.model';
import { CatalogFilters, Experience, Modality } from '../../../core/models/experience.model';
import { eventTimeInBolivia } from '../../../core/utils/event-time.util';

@Component({
  selector: 'app-catalog',
  imports: [
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    IconComponent,
    EventSkeletonComponent,
  ],
  templateUrl: './catalog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly experienceService = inject(ExperienceService);
  private readonly reload = new Subject<void>();
  readonly auth = inject(AuthService);
  readonly categories = signal<Category[]>([]);
  readonly loadingCategories = signal(true);
  readonly allExperiences = signal<Experience[]>([]);
  readonly filteredExperiences = this.allExperiences.asReadonly();
  readonly loading = signal(true);
  readonly backendError = signal(false);
  readonly selectedCategoryId = signal('');
  readonly selectedModality = signal<Modality | ''>('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly locationIncomplete = signal(false);
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    zone: [''],
    onlyOpen: [false],
    dateFrom: [''],
    dateTo: [''],
    latitude: this.fb.control<number | null>(null),
    longitude: this.fb.control<number | null>(null),
    radius: [10],
  });

  /** Consulta filtros y páginas en el servidor y cancela respuestas de búsquedas anteriores. */
  ngOnInit(): void {
    this.loadCategories();
    this.filterForm.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadCatalog();
      });
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          const raw = this.filterForm.getRawValue();
          const incomplete = (raw.latitude === null) !== (raw.longitude === null);
          this.locationIncomplete.set(incomplete);
          this.loading.set(!incomplete);
          this.backendError.set(false);
          if (incomplete) return of(null);
          const filters: CatalogFilters = {
            search: raw.search.trim(),
            zone: raw.zone.trim(),
            category_id: this.selectedCategoryId(),
            modality: this.selectedModality(),
            only_available: raw.onlyOpen,
            page: this.page(),
            page_size: 12,
            date_from: raw.dateFrom ? eventTimeInBolivia(raw.dateFrom, '00:00') : undefined,
            date_to: raw.dateTo
              ? new Date(`${raw.dateTo}T23:59:59.999-04:00`).toISOString()
              : undefined,
            latitude: raw.latitude ?? undefined,
            longitude: raw.longitude ?? undefined,
            radius_km: raw.latitude !== null && raw.longitude !== null ? raw.radius : undefined,
          };
          return this.experienceService.getCatalog(filters).pipe(
            catchError(() => {
              this.backendError.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.allExperiences.set(result?.experiences ?? []);
        this.total.set(result?.total ?? 0);
        this.totalPages.set(result?.total_pages ?? 1);
        this.loading.set(false);
      });
  }

  /** Carga categorías oficiales; evita identificadores inventados en filtros. */
  loadCategories(): void {
    this.loadingCategories.set(true);
    this.experienceService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          this.loadingCategories.set(false);
        },
        error: () => {
          this.categories.set([]);
          this.loadingCategories.set(false);
        },
      });
  }

  /** Repite la consulta actual, conservando sus filtros. */
  loadCatalog(): void {
    this.reload.next();
  }

  /** Selecciona categoría y vuelve a la primera página del servidor. */
  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.page.set(1);
    this.loadCatalog();
  }

  /** Selecciona modalidad y vuelve a la primera página del servidor. */
  selectModality(modality: Modality | ''): void {
    this.selectedModality.set(modality);
    this.page.set(1);
    this.loadCatalog();
  }

  /** Navega entre páginas reales del resultado. */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.loadCatalog();
  }

  /** Mide progreso contra el mínimo viable, diferenciado de la capacidad máxima. */
  quorumProgressPercent(experience: Experience): number {
    return Math.min(
      100,
      Math.round((100 * experience.reserved_slots) / Math.max(1, experience.min_capacity)),
    );
  }

  /** Usa el estado de quórum canónico del backend. */
  isQuorumMet(experience: Experience): boolean {
    return experience.is_quorum_reached;
  }
}
