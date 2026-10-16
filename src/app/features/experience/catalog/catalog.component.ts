import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExperienceService } from '../../../core/services/experience.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Experience, Category } from '../../../core/models/models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- HERO BANNER -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-indigo-700/50">
        <div class="relative z-10 max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-4">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ 'catalog.badge' | translate }}
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {{ 'catalog.heroTitle' | translate }}
          </h1>
          <p class="mt-3 text-sm sm:text-base text-indigo-100 max-w-2xl leading-relaxed">
            {{ 'catalog.heroSubtitle' | translate }}
          </p>
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <a
              routerLink="/experiences/create"
              class="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-md flex items-center gap-2"
            >
              <span>✨</span>
              <span>{{ 'catalog.publishNow' | translate }}</span>
            </a>
          </div>
        </div>

        <!-- Decorative background shapes -->
        <div class="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
      </div>

      <!-- EXPLICACIÓN CLAVE DE QUÓRUM PARA PRIMEROS USUARIOS -->
      <div class="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-sm flex items-start gap-3.5">
        <div class="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
          💡
        </div>
        <div>
          <h4 class="text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-200">
            {{ 'catalog.quorumInfoTitle' | translate }}
          </h4>
          <p class="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
            {{ 'catalog.quorumInfoText' | translate }}
          </p>
        </div>
      </div>

      <!-- BARRA DE FILTROS Y BÚSQUEDA -->
      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <!-- Input de Búsqueda -->
          <div class="relative flex-1">
            <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              [placeholder]="'catalog.searchPlaceholder' | translate"
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <!-- Selector de Modalidad -->
          <div class="flex items-center gap-2">
            <select
              [(ngModel)]="selectedModality"
              (ngModelChange)="applyFilters()"
              class="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="">{{ 'catalog.modAll' | translate }}</option>
              <option value="IN_PERSON">🏢 Presencial</option>
              <option value="VIRTUAL">💻 Virtual</option>
              <option value="HYBRID">🌐 Híbrido</option>
            </select>
          </div>
        </div>

        <!-- Chips de Categorías -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            (click)="selectCategory(0)"
            [class]="selectedCategoryId() === 0 ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
            class="px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer"
          >
            {{ 'catalog.all' | translate }}
          </button>
          @for (cat of categories(); track cat.id) {
            <button
              type="button"
              (click)="selectCategory(cat.id)"
              [class]="selectedCategoryId() === cat.id ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              class="px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer"
            >
              {{ cat.name }}
            </button>
          }
        </div>
      </div>

      <!-- GRID DE EXPERIENCIAS -->
      @if (filteredExperiences().length === 0) {
        <div class="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <span class="text-4xl">🔭</span>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ 'catalog.emptyTitle' | translate }}
          </h3>
          <p class="text-sm text-slate-500 max-w-md mx-auto">
            {{ 'catalog.emptyDesc' | translate }}
          </p>
          <div class="pt-2">
            <a
              routerLink="/experiences/create"
              class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow"
            >
              {{ 'catalog.publishNow' | translate }}
            </a>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (exp of filteredExperiences(); track exp.id) {
            <div class="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              
              <div>
                <!-- Portada con Badges -->
                <div class="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    [src]="exp.cover_image_url"
                    alt="{{ exp.title }}"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  <!-- Badge Modalidad -->
                  <div class="absolute top-3 right-3 flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md shadow">
                      {{ exp.modality === 'IN_PERSON' ? '🏢 Presencial' : exp.modality === 'VIRTUAL' ? '💻 Virtual' : '🌐 Híbrido' }}
                    </span>
                  </div>

                  <!-- Tag Categoría -->
                  <div class="absolute bottom-3 left-3">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-md">
                      {{ exp.category_name || 'Experiencia' }}
                    </span>
                  </div>
                </div>

                <!-- Contenido -->
                <div class="p-5 space-y-3">
                  <!-- Fecha y Ubicación -->
                  <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span class="flex items-center gap-1">
                      📅 {{ exp.event_date | date:'dd MMM yyyy, HH:mm' }}
                    </span>
                    <span class="font-semibold text-slate-700 dark:text-slate-300">
                      📍 {{ exp.zone || exp.venue_name || 'Santa Cruz' }}
                    </span>
                  </div>

                  <h3 class="font-extrabold text-slate-900 dark:text-white text-lg line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {{ exp.title }}
                  </h3>

                  <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {{ exp.description }}
                  </p>

                  <!-- BARRA DE QUÓRUM INTELIGENTE -->
                  <div class="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-semibold">
                      <span class="text-slate-600 dark:text-slate-400">
                        @if (exp.reserved_slots >= exp.min_capacity || exp.is_quorum_reached) {
                          <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <span>✅</span> {{ 'catalog.quorumReached' | translate }}
                          </span>
                        } @else {
                          <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>⏳</span> {{ 'catalog.quorumNeeded' | translate }} <b>{{ exp.min_capacity - exp.reserved_slots }}</b>
                          </span>
                        }
                      </span>
                      <span class="text-slate-800 dark:text-slate-200 font-bold">
                        {{ exp.reserved_slots }} / {{ exp.max_capacity }}
                      </span>
                    </div>

                    <!-- Progreso hacia Quórum -->
                    <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        class="h-full transition-all duration-500"
                        [ngClass]="exp.reserved_slots >= exp.min_capacity ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-indigo-500'"
                        [style.width.%]="Math.min(100, (exp.reserved_slots / exp.max_capacity) * 100)"
                      ></div>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Meta de confirmación: <strong class="text-amber-600 dark:text-amber-400">{{ exp.min_capacity }} cupos</strong></span>
                      <span>Capacidad máx: {{ exp.max_capacity }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer con Precio y Botón de Acción -->
              <div class="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Precio por cupo</span>
                  <div class="text-xl font-black text-slate-900 dark:text-white">
                    Bs. {{ exp.price }}
                  </div>
                </div>

                <a
                  [routerLink]="['/experiences', exp.id]"
                  class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer"
                >
                  {{ 'catalog.reserveBtn' | translate }} →
                </a>
              </div>

            </div>
          }
        </div>
      }

    </div>
  `,
})
export class CatalogComponent implements OnInit {
  private experienceService = inject(ExperienceService);
  i18n = inject(I18nService);
  Math = Math;

  categories = signal<Category[]>([]);
  allExperiences = signal<Experience[]>([]);
  filteredExperiences = signal<Experience[]>([]);

  searchQuery = '';
  selectedModality = '';
  selectedCategoryId = signal<number>(0);

  ngOnInit(): void {
    this.experienceService.getCategories().subscribe((cats) => {
      this.categories.set(cats);
    });

    this.loadCatalog();
  }

  loadCatalog(): void {
    this.experienceService.getCatalog().subscribe((res) => {
      this.allExperiences.set(res.experiences);
      this.applyFilters();
    });
  }

  selectCategory(id: number): void {
    this.selectedCategoryId.set(id);
    this.applyFilters();
  }

  applyFilters(): void {
    let items = this.allExperiences();

    if (this.selectedCategoryId() > 0) {
      items = items.filter((x) => x.category_id === this.selectedCategoryId());
    }

    if (this.selectedModality) {
      items = items.filter((x) => x.modality === this.selectedModality);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      items = items.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.description.toLowerCase().includes(q) ||
          (x.venue_name && x.venue_name.toLowerCase().includes(q)) ||
          (x.zone && x.zone.toLowerCase().includes(q))
      );
    }

    this.filteredExperiences.set(items);
  }
}
