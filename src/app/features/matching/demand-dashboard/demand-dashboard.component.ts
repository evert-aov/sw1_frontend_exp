import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-demand-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Unmet Demand Insights Component (CU-08)</h2></div>`,
})
export class DemandDashboardComponent {
  onSelectZone(zone: string): void {
    // Firma para filtrar demandas insatisfechas por zona urbana
  }
}
