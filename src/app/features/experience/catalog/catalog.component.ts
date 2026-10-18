import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExperienceService } from '../../../core/services/experience.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { EventSkeletonComponent } from '../../../shared/components/event-skeleton/event-skeleton.component';
import { Category } from '../../../core/models/category.model';
import { Experience, Modality } from '../../../core/models/experience.model';

/**
 * Componente del Catálogo de Experiencias (CU-04 / HU-05, HU-06).
 *
 * Muestra el listado de experiencias obtenidas del backend FastAPI con:
 * - Skeleton loaders reactivos para mejorar el rendimiento percibido mientras se cargan los datos.
 * - Filtro dinámico por categorías temáticas.
 * - Filtro por modalidad (Presencial, Virtual, Híbrido, Todas).
 * - Búsqueda por texto y zona urbana.
 * - Toggle para filtrar solo eventos con cupos abiertos.
 * - Barra de progreso visual del quórum mínimo viable.
 */
@Component({
  selector: 'app-catalog',
  imports: [
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
  private readonly fb = inject(FormBuilder);
  private readonly experienceService = inject(ExperienceService);

  /** Listado de categorías temáticas disponibles */
  readonly categories = signal<Category[]>([]);

  /** Estado de carga de las categorías */
  readonly loadingCategories = signal<boolean>(true);

  /** Colección completa de experiencias obtenidas de FastAPI */
  readonly allExperiences = signal<Experience[]>([]);

  /** Estado de carga del catálogo (activa skeleton loaders) */
  readonly loading = signal<boolean>(true);

  /** Bandera de error de conectividad con el servidor */
  readonly backendError = signal<boolean>(false);

  /** Categoría seleccionada actualmente (0 para Todas) */
  readonly selectedCategoryId = signal<number>(0);

  /** Modalidad seleccionada actualmente (cadena vacía para Todas) */
  readonly selectedModality = signal<Modality | ''>('');

  /** Formulario reactivo para filtros de texto y zona */
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    zone: [''],
    onlyOpen: [false],
  });

  /** Señal de los valores del formulario de filtros */
  private readonly filterValues = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.getRawValue(),
  });

  /**
   * Lista reactiva de experiencias filtradas según los criterios seleccionados por el usuario.
   */
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

  /**
   * Inicialización del componente: invoca la carga de categorías y el catálogo.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    this.loadCategories();
    this.loadCatalog();
  }

  /**
   * Consulta las categorías temáticas en el backend FastAPI.
   *
   * @returns {void}
   */
  loadCategories(): void {
    this.loadingCategories.set(true);
    this.experienceService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.categories.set([]);
        this.loadingCategories.set(false);
      },
    });
  }

  /**
   * Consulta las experiencias publicadas en el backend FastAPI.
   *
   * @returns {void}
   */
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

  /**
   * Filtra las experiencias por una categoría específica.
   *
   * @param {number} id - Identificador de la categoría (0 para 'Todas').
   * @returns {void}
   */
  selectCategory(id: number): void {
    this.selectedCategoryId.set(id);
  }

  /**
   * Filtra las experiencias por una modalidad (Presencial, Virtual, Híbrido, Todas).
   *
   * @param {Modality | ''} modality - Modalidad seleccionada o cadena vacía para ver todas.
   * @returns {void}
   */
  selectModality(modality: Modality | ''): void {
    this.selectedModality.set(modality);
  }

  /**
   * Calcula el porcentaje visual de avance hacia el aforo del evento.
   *
   * @param {Experience} exp - Entidad de la experiencia.
   * @returns {number} Porcentaje entre 0 y 100.
   */
  quorumProgressPercent(exp: Experience): number {
    const target = exp.max_capacity > 0 ? exp.max_capacity : exp.min_capacity || 1;
    return Math.min(100, Math.round((exp.reserved_slots / target) * 100));
  }

  /**
   * Determina si la experiencia alcanzó o superó su quórum mínimo viable.
   *
   * @param {Experience} exp - Entidad de la experiencia.
   * @returns {boolean} True si se alcanzó el quórum mínimo para confirmar el evento.
   */
  isQuorumMet(exp: Experience): boolean {
    return exp.is_quorum_reached || exp.reserved_slots >= exp.min_capacity;
  }
}
