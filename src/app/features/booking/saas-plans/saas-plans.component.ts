import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-saas-plans',
  imports: [],
  templateUrl: './saas-plans.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaasPlansComponent {
  onSubscribe(planId: number): void {
    // Firma para contratar suscripción recurrente
  }
}
