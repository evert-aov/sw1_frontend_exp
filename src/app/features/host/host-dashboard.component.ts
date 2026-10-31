import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ExperienceService, HostedExperience } from '../../core/services/experience.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  ButtonComponent,
  ButtonLinkDirective,
  FormFieldComponent,
  InputDirective,
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  DialogComponent,
} from '../../shared/ui';

export type HostFilterTab = 'ALL' | 'ACTIVE' | 'QUORUM' | 'PENDING' | 'CLOSED';

/**
 * Tablero de Gestión de Experiencias y Aforos para Anfitriones y Locales (CU-03).
 */
@Component({
  selector: 'app-host-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    DialogComponent,
  ],
  templateUrl: './host-dashboard.component.html',
})
export class HostDashboardComponent implements OnInit {
  private readonly api = inject(ExperienceService);
  readonly i18n = inject(I18nService);

  readonly items = signal<HostedExperience[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly deleting = signal<HostedExperience | null>(null);

  /** Pestaña de filtrado por estado de ciclo de vida */
  readonly filterTab = signal<HostFilterTab>('ALL');

  /** Búsqueda por texto libre en tiempo real */
  readonly searchQuery = signal('');

  /** Conteo de eventos activos en catálogo o en curso */
  readonly activeCount = computed(
    () => this.items().filter((item) => ['OPEN', 'CONFIRMED', 'LIVE'].includes(item.status)).length,
  );

  /** Total acumulado de cupos reservados/pagados */
  readonly seats = computed(() =>
    this.items().reduce((sum, item) => sum + item.reserved_slots, 0),
  );

  /** Recaudación bruta total proyectada según reservas */
  readonly totalRevenue = computed(() =>
    this.items().reduce((sum, item) => sum + item.reserved_slots * item.price, 0),
  );

  /** Conteo de experiencias que ya superaron su cupo mínimo viable */
  readonly quorumReachedCount = computed(
    () => this.items().filter((item) => item.is_quorum_reached).length,
  );

  /** Experiencias filtradas según la pestaña y la búsqueda ingresada */
  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const tab = this.filterTab();

    return this.items().filter((item) => {
      // Filtro por pestaña de estado
      if (tab === 'ACTIVE' && !['OPEN', 'CONFIRMED', 'LIVE'].includes(item.status)) return false;
      if (tab === 'QUORUM' && !item.is_quorum_reached) return false;
      if (tab === 'PENDING' && (item.is_quorum_reached || item.status !== 'OPEN')) return false;
      if (tab === 'CLOSED' && !['COMPLETED', 'CANCELLED'].includes(item.status)) return false;

      // Filtro por texto libre
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchVenue = (item.venue_name ?? '').toLowerCase().includes(q);
        const matchZone = (item.venue_zone ?? '').toLowerCase().includes(q);
        const matchCat = (item.category_name ?? '').toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchZone && !matchCat) return false;
      }
      return true;
    });
  });

  deleteTrigger: HTMLElement | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getMyExperiences()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set(this.i18n.translate('host.loadError')),
      });
  }

  setFilterTab(tab: HostFilterTab): void {
    this.filterTab.set(tab);
  }

  clearFilters(): void {
    this.filterTab.set('ALL');
    this.searchQuery.set('');
  }

  /** Porcentaje de aforo cubierto */
  getOccupancyPercent(item: HostedExperience): number {
    return Math.min(100, Math.round((item.reserved_slots / Math.max(item.max_capacity, 1)) * 100));
  }

  /** Porcentaje requerido para alcanzar el quórum mínimo viable */
  getQuorumTargetPercent(item: HostedExperience): number {
    return Math.min(100, Math.round((item.min_capacity / Math.max(item.max_capacity, 1)) * 100));
  }

  requestDelete(item: HostedExperience, event: Event): void {
    this.deleteTrigger = event.currentTarget as HTMLElement;
    this.deleting.set(item);
  }

  confirmDelete(): void {
    const item = this.deleting();
    if (!item || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .deleteExperience(item.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.items.update((items) => items.filter((row) => row.id !== item.id));
          this.deleting.set(null);
        },
        error: (err) => {
          this.deleting.set(null);
          this.error.set(err.error?.detail ?? this.i18n.translate('host.deleteError'));
        },
      });
  }
}
