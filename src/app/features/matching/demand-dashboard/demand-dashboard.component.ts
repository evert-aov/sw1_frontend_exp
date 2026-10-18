import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatchingService } from '../../../core/services/matching.service';
import { UnmetDemandInsight } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-demand-dashboard',
  imports: [DecimalPipe, TranslatePipe, IconComponent],
  templateUrl: './demand-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandDashboardComponent implements OnInit {
  private readonly matchingService = inject(MatchingService);

  readonly insights = signal<UnmetDemandInsight[]>([]);
  readonly loading = signal<boolean>(true);

  ngOnInit(): void {
    this.onSelectZone('');
  }

  onSelectZone(zone: string): void {
    this.loading.set(true);
    this.matchingService.getDemandInsights(zone).subscribe({
      next: (items) => {
        this.insights.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.insights.set([]);
        this.loading.set(false);
      },
    });
  }
}
