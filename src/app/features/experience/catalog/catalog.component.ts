import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h2>Catalog Component (CU-04)</h2></div>`,
})
export class CatalogComponent {
  onFilterChange(): void {
    // Firma para filtrar experiencias por categoría, fecha o cercanía
  }
}
