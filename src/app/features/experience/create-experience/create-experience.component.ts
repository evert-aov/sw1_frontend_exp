import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExperienceService, CommissionBreakdown } from '../../../core/services/experience.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Category, Experience, Modality } from '../../../core/models/models';

@Component({
  selector: 'app-create-experience',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header con Badges de CU-04 y HU-07 -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {{ 'exp.create.badge' | translate }}
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {{ 'exp.create.title' | translate }}
          </h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {{ 'exp.create.subtitle' | translate }}
          </p>
        </div>

        <!-- Botones de Acción Rápida -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="fillDemoData()"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-sm cursor-pointer"
            title="Autocompletar formulario con datos de ejemplo para pruebas rápidas"
          >
            <span>⚡</span>
            <span>{{ 'exp.create.demoBtn' | translate }}</span>
          </button>
          <button
            type="button"
            (click)="resetForm()"
            class="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {{ 'common.cancel' | translate }}
          </button>
        </div>
      </div>

      <!-- Banner de Éxito al Publicar -->
      @if (showSuccessModal()) {
        <div class="mb-8 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shadow-sm animate-fade-in">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow">
                ✓
              </div>
              <div>
                <h3 class="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  {{ 'exp.alert.successTitle' | translate }}
                </h3>
                <p class="text-sm text-emerald-700 dark:text-emerald-300">
                  {{ 'exp.alert.successDesc' | translate }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a
                routerLink="/catalog"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
              >
                {{ 'exp.alert.viewCatalog' | translate }} →
              </a>
              <button
                type="button"
                (click)="showSuccessModal.set(false)"
                class="text-xs text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-1 cursor-pointer"
              >
                {{ 'common.close' | translate }}
              </button>
            </div>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- COLUMNA IZQUIERDA: Formulario Principal (7 de 12 columnas) -->
        <form (ngSubmit)="onSubmitExperience()" class="lg:col-span-7 space-y-6">
          
          <!-- SECCIÓN 1: Información General -->
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
              {{ 'exp.form.secBasic' | translate }}
            </h2>

            <!-- Título -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {{ 'exp.form.titleLabel' | translate }} *
              </label>
              <input
                type="text"
                name="title"
                [(ngModel)]="formData.title"
                required
                [placeholder]="'exp.form.titlePlaceholder' | translate"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <!-- Categoría -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {{ 'exp.form.categoryLabel' | translate }} *
              </label>
              <select
                name="category_id"
                [(ngModel)]="formData.category_id"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }} ({{ cat.description }})</option>
                }
              </select>
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {{ 'exp.form.descLabel' | translate }} *
              </label>
              <textarea
                name="description"
                [(ngModel)]="formData.description"
                rows="3"
                required
                [placeholder]="'exp.form.descPlaceholder' | translate"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              ></textarea>
            </div>

            <!-- Imagen de Portada y Presets -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {{ 'exp.form.imageLabel' | translate }}
              </label>
              <input
                type="url"
                name="cover_image_url"
                [(ngModel)]="formData.cover_image_url"
                [placeholder]="'exp.form.imagePlaceholder' | translate"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />

              <!-- Presets en 1 Clic -->
              <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span class="text-[11px] font-semibold">{{ 'exp.form.imagePresets' | translate }}</span>
                @for (preset of imagePresets; track preset.label) {
                  <button
                    type="button"
                    (click)="formData.cover_image_url = preset.url"
                    class="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {{ preset.label }}
                  </button>
                }
              </div>

              <!-- Vista Previa de Imagen -->
              @if (formData.cover_image_url) {
                <div class="mt-3 relative h-36 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                  <img
                    [src]="formData.cover_image_url"
                    alt="Preview"
                    class="w-full h-full object-cover"
                    (error)="onImageError($event)"
                  />
                  <div class="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                    Vista previa de portada
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- SECCIÓN 2: Modalidad y Ubicación -->
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
              {{ 'exp.form.secModality' | translate }}
            </h2>

            <!-- Selector de Modalidad (Chips Elegantes) -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                {{ 'exp.form.modalityLabel' | translate }} *
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  (click)="formData.modality = 'IN_PERSON'"
                  [class]="formData.modality === 'IN_PERSON' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'"
                  class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span class="text-lg">🏢</span>
                  <span class="text-xs">{{ 'exp.form.modInPerson' | translate }}</span>
                </button>

                <button
                  type="button"
                  (click)="formData.modality = 'VIRTUAL'"
                  [class]="formData.modality === 'VIRTUAL' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'"
                  class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span class="text-lg">💻</span>
                  <span class="text-xs">{{ 'exp.form.modVirtual' | translate }}</span>
                </button>

                <button
                  type="button"
                  (click)="formData.modality = 'HYBRID'"
                  [class]="formData.modality === 'HYBRID' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'"
                  class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span class="text-lg">🌐</span>
                  <span class="text-xs">{{ 'exp.form.modHybrid' | translate }}</span>
                </button>
              </div>
            </div>

            <!-- Campos condicionales según modalidad -->
            @if (formData.modality !== 'VIRTUAL') {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {{ 'exp.form.venueLabel' | translate }} *
                  </label>
                  <input
                    type="text"
                    name="venue_name"
                    [(ngModel)]="formData.venue_name"
                    [placeholder]="'exp.form.venuePlaceholder' | translate"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {{ 'exp.form.zoneLabel' | translate }}
                  </label>
                  <select
                    name="zone"
                    [(ngModel)]="formData.zone"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="Equipetrol">Equipetrol</option>
                    <option value="Centro Histórico">Centro Histórico</option>
                    <option value="Urubó">Urubó</option>
                    <option value="Las Palmas">Las Palmas</option>
                    <option value="Villa 1ro de Mayo">Villa 1ro de Mayo</option>
                    <option value="Zona Norte">Zona Norte</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {{ 'exp.form.addressLabel' | translate }}
                  </label>
                  <input
                    type="text"
                    name="address"
                    [(ngModel)]="formData.address"
                    [placeholder]="'exp.form.addressPlaceholder' | translate"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            }

            @if (formData.modality !== 'IN_PERSON') {
              <div class="pt-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.virtualUrlLabel' | translate }}
                </label>
                <input
                  type="url"
                  name="virtual_meeting_url"
                  [(ngModel)]="formData.virtual_meeting_url"
                  [placeholder]="'exp.form.virtualUrlPlaceholder' | translate"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            }
          </div>

          <!-- SECCIÓN 3: Fecha y Horarios -->
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
              {{ 'exp.form.secSchedule' | translate }}
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.dateLabel' | translate }} *
                </label>
                <input
                  type="date"
                  name="event_date_only"
                  [(ngModel)]="eventDateOnly"
                  required
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.timeLabel' | translate }} *
                </label>
                <input
                  type="time"
                  name="event_time_only"
                  [(ngModel)]="eventTimeOnly"
                  required
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.durationLabel' | translate }}
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  [(ngModel)]="formData.duration_minutes"
                  min="30"
                  max="480"
                  step="15"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <!-- SECCIÓN 4: Aforos, Quórum y Precios (HU-04) -->
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">4</span>
              {{ 'exp.form.secCapacity' | translate }}
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- Aforo Mínimo (Quórum) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {{ 'exp.form.minCapLabel' | translate }} *
                  </label>
                  <span class="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    Quórum
                  </span>
                </div>
                <input
                  type="number"
                  name="min_capacity"
                  [(ngModel)]="formData.min_capacity"
                  min="2"
                  max="100"
                  required
                  class="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ 'exp.form.minCapHint' | translate }}
                </p>
              </div>

              <!-- Cupo Límite (Aforo Máximo) -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.maxCapLabel' | translate }} *
                </label>
                <input
                  type="number"
                  name="max_capacity"
                  [(ngModel)]="formData.max_capacity"
                  [min]="formData.min_capacity || 2"
                  max="150"
                  required
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ 'exp.form.maxCapHint' | translate }}
                </p>
              </div>

              <!-- Precio por Cupo -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ 'exp.form.priceLabel' | translate }} *
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Bs.</span>
                  <input
                    type="number"
                    name="price"
                    [(ngModel)]="formData.price"
                    min="10"
                    step="5"
                    required
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p class="mt-1 text-[11px] text-slate-500">
                  {{ 'exp.form.priceHint' | translate }}
                </p>
              </div>
            </div>

            <!-- Advertencia si min > max -->
            @if (formData.min_capacity && formData.max_capacity && formData.min_capacity > formData.max_capacity) {
              <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>El aforo mínimo no puede ser mayor que el cupo límite de participantes.</span>
              </div>
            }
          </div>

          <!-- Botón de Envío -->
          <div class="pt-2">
            <button
              type="submit"
              [disabled]="isSubmitting() || (formData.min_capacity > formData.max_capacity)"
              class="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-bold text-base shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              @if (isSubmitting()) {
                <span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ 'exp.btn.publishing' | translate }}</span>
              } @else {
                <span>✨</span>
                <span>{{ 'exp.btn.publish' | translate }}</span>
              }
            </button>
          </div>
        </form>

        <!-- COLUMNA DERECHA: Widget Interactivo de Desglose de Ingresos y Comisión Escalonada (HU-07) (5 de 12 columnas) -->
        <div class="lg:col-span-5 sticky top-24 space-y-6">
          
          <div class="p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md">
            
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {{ 'exp.breakdown.badge' | translate }}
                </span>
                <h3 class="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {{ 'exp.breakdown.title' | translate }}
                </h3>
              </div>
              <span class="text-2xl">📊</span>
            </div>

            <!-- Indicador Visual de Viabilidad de Quórum -->
            <div class="mb-5 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div class="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span class="text-slate-600 dark:text-slate-400">Punto de Equilibrio (Quórum):</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-bold">
                  {{ formData.min_capacity || 0 }} de {{ formData.max_capacity || 0 }} cupos
                </span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                  [style.width.%]="quorumPercentage()"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0</span>
                <span>Meta Mínima: {{ formData.min_capacity }}</span>
                <span>Cupo Máx: {{ formData.max_capacity }}</span>
              </div>
            </div>

            <!-- Desglose de Métricas Financieras (HU-07) -->
            <div class="space-y-3 text-sm">
              
              <!-- 1. Ingreso Mínimo Garantizado -->
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span class="text-slate-600 dark:text-slate-400 text-xs">
                  {{ 'exp.breakdown.guaranteedRevenue' | translate }}
                </span>
                <span class="font-bold text-slate-900 dark:text-white">
                  Bs. {{ guaranteedGrossRevenue() | number:'1.2-2' }}
                </span>
              </div>

              <!-- 2. Ingreso Potencial Máximo -->
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span class="text-slate-600 dark:text-slate-400 text-xs">
                  {{ 'exp.breakdown.maxRevenue' | translate }}
                </span>
                <span class="font-bold text-slate-900 dark:text-white">
                  Bs. {{ maxGrossRevenue() | number:'1.2-2' }}
                </span>
              </div>

              <!-- 3. Tramo de Comisión Escalonada -->
              <div class="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 my-2">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-semibold text-indigo-900 dark:text-indigo-200">
                    {{ 'exp.breakdown.tierApplied' | translate }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-sm">
                    {{ commission().ratePercent }}%
                  </span>
                </div>
                <p class="text-[11px] text-indigo-700 dark:text-indigo-300">
                  {{ commission().tierKey | translate }}
                </p>
                <div class="flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 mt-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60">
                  <span>{{ 'exp.breakdown.feePerTicket' | translate }}</span>
                  <span class="font-semibold">- Bs. {{ commission().feePerTicket | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- 4. Ganancia Neta Asegurada para el Anfitrión -->
              <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-0.5">
                  {{ 'exp.breakdown.totalNetQuorum' | translate }}
                </div>
                <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  Bs. {{ guaranteedNetRevenue() | number:'1.2-2' }}
                </div>
                <div class="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span>{{ 'exp.breakdown.totalNetMax' | translate }}</span>
                  <span class="font-bold">Bs. {{ maxNetRevenue() | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Consejo de Quórum Inteligente -->
            <div class="mt-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
              <span class="text-base">💡</span>
              <div>
                <h4 class="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {{ 'exp.breakdown.tipTitle' | translate }}
                </h4>
                <p class="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                  {{ 'exp.breakdown.tipText' | translate }}
                </p>
              </div>
            </div>

          </div>

          <!-- Tarjeta de anfitrión verificado -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow">
              RB
            </div>
            <div>
              <p class="font-bold text-slate-800 dark:text-slate-200">Ricardo Brian Rivero Flores</p>
              <p class="text-[11px]">Anfitrión & Desarrollador Frontend • Sprint 1</p>
            </div>
          </div>

        </div>
      </div>

      <!-- SECCIÓN INFERIOR: Experiencias Publicadas Recientes -->
      <div class="mt-14 border-t border-slate-200 dark:border-slate-800 pt-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">
              {{ 'exp.recent.title' | translate }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Registros persistentes en catálogo listos para recibir asistentes y reservas.
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {{ recentExperiences().length }} publicadas
          </span>
        </div>

        @if (recentExperiences().length === 0) {
          <div class="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-sm">
            {{ 'exp.recent.empty' | translate }}
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (item of recentExperiences(); track item.id) {
              <div class="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div class="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      [src]="item.cover_image_url"
                      alt="{{ item.title }}"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        {{ item.modality }}
                      </span>
                    </div>
                    <div class="absolute bottom-2.5 left-2.5">
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow">
                        {{ item.category_name || 'Experiencia' }}
                      </span>
                    </div>
                  </div>

                  <div class="p-4">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base line-clamp-1">
                      {{ item.title }}
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {{ item.description }}
                    </p>

                    <!-- Info de Cupo y Quórum -->
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Quórum mín:</span>
                        <span class="font-bold text-amber-600 dark:text-amber-400">{{ item.min_capacity }} pers.</span>
                      </div>
                      <div>
                        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Aforo límite:</span>
                        <span class="font-bold text-slate-700 dark:text-slate-300">{{ item.max_capacity }} pers.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span class="text-[10px] text-slate-400 block uppercase font-semibold">Precio por cupo</span>
                    <span class="text-base font-black text-indigo-600 dark:text-indigo-400">Bs. {{ item.price }}</span>
                  </div>
                  <span class="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Abierto
                  </span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CreateExperienceComponent implements OnInit {
  private experienceService = inject(ExperienceService);
  i18n = inject(I18nService);

  categories = signal<Category[]>([]);
  isSubmitting = signal(false);
  showSuccessModal = signal(false);
  recentExperiences = signal<Experience[]>([]);

  // Presets de imágenes de alta calidad
  imagePresets = [
    { label: '🥖 Panadería', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80' },
    { label: '☕ Café & Barismo', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80' },
    { label: '🎨 Arte & Pintura', url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=80' },
    { label: '🍸 Coctelería', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80' },
    { label: '🍕 Pizzas Artesanales', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80' },
  ];

  // Campos para fecha y hora separadas en el input
  eventDateOnly = '';
  eventTimeOnly = '18:00';

  // Modelo del formulario
  formData: {
    title: string;
    description: string;
    category_id: number;
    modality: Modality;
    venue_name: string;
    zone: string;
    address: string;
    virtual_meeting_url: string;
    cover_image_url: string;
    min_capacity: number;
    max_capacity: number;
    price: number;
    duration_minutes: number;
  } = {
    title: '',
    description: '',
    category_id: 1,
    modality: 'IN_PERSON',
    venue_name: '',
    zone: 'Equipetrol',
    address: '',
    virtual_meeting_url: '',
    cover_image_url: '',
    min_capacity: 6,
    max_capacity: 12,
    price: 150,
    duration_minutes: 120,
  };

  // Cálculos reactivos en tiempo real (HU-07)
  commission = computed<CommissionBreakdown>(() => {
    return this.experienceService.calculateCommission(this.formData.price);
  });

  guaranteedGrossRevenue = computed(() => {
    return (Number(this.formData.min_capacity) || 0) * (Number(this.formData.price) || 0);
  });

  maxGrossRevenue = computed(() => {
    return (Number(this.formData.max_capacity) || 0) * (Number(this.formData.price) || 0);
  });

  guaranteedNetRevenue = computed(() => {
    const gross = this.guaranteedGrossRevenue();
    const feeRate = this.commission().rate;
    return gross * (1 - feeRate);
  });

  maxNetRevenue = computed(() => {
    const gross = this.maxGrossRevenue();
    const feeRate = this.commission().rate;
    return gross * (1 - feeRate);
  });

  quorumPercentage = computed(() => {
    const min = Number(this.formData.min_capacity) || 0;
    const max = Number(this.formData.max_capacity) || 1;
    if (max <= 0) return 0;
    return Math.min(100, Math.round((min / max) * 100));
  });

  ngOnInit(): void {
    // Inicializar fecha para mañana por defecto
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    this.eventDateOnly = tomorrow.toISOString().split('T')[0];

    // Cargar categorías y experiencias previas
    this.experienceService.getCategories().subscribe((cats) => {
      this.categories.set(cats);
      if (cats.length > 0 && !this.formData.category_id) {
        this.formData.category_id = cats[0].id;
      }
    });

    this.refreshRecentExperiences();
  }

  // Autocompletar datos demo para pruebas inmediatas
  fillDemoData(): void {
    this.formData = {
      title: 'Masterclass de Coctelería de Autor & Mixología Botánica',
      description: 'Una experiencia inmersiva para dominar técnicas de maceración, destilados bolivianos con gin La República y maridaje con tapas fusión en terraza privada.',
      category_id: 4,
      modality: 'IN_PERSON',
      venue_name: 'Terraza Rooftop 21',
      zone: 'Equipetrol',
      address: 'Calle Los Cusis #300, Piso 7',
      virtual_meeting_url: '',
      cover_image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80',
      min_capacity: 8,
      max_capacity: 15,
      price: 210,
      duration_minutes: 150,
    };
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 10);
    this.eventDateOnly = nextWeek.toISOString().split('T')[0];
    this.eventTimeOnly = '19:30';
  }

  resetForm(): void {
    this.formData = {
      title: '',
      description: '',
      category_id: this.categories()[0]?.id || 1,
      modality: 'IN_PERSON',
      venue_name: '',
      zone: 'Equipetrol',
      address: '',
      virtual_meeting_url: '',
      cover_image_url: '',
      min_capacity: 6,
      max_capacity: 12,
      price: 150,
      duration_minutes: 120,
    };
  }

  onSubmitExperience(): void {
    if (!this.formData.title || !this.formData.description || !this.formData.price) {
      alert('Por favor completa todos los campos requeridos (*)');
      return;
    }

    if (this.formData.min_capacity > this.formData.max_capacity) {
      alert('El aforo mínimo (quórum) no puede superar el cupo límite.');
      return;
    }

    this.isSubmitting.set(true);

    // Combinar fecha y hora
    const combinedDate = new Date(`${this.eventDateOnly}T${this.eventTimeOnly || '18:00'}:00Z`).toISOString();

    const payload: Partial<Experience> = {
      ...this.formData,
      event_date: combinedDate,
    };

    this.experienceService.createExperience(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
        this.refreshRecentExperiences();
        // Reset campos clave pero manteniendo el éxito a la vista
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
        this.refreshRecentExperiences();
      },
    });
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80';
  }

  private refreshRecentExperiences(): void {
    this.recentExperiences.set(this.experienceService.getUserPublishedExperiences());
  }
}
