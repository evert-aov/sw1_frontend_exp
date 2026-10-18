import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Componente de Planes de Suscripción SaaS para Anfitriones y Sedes (CU-14).
 *
 * Expone niveles de membresía con analíticas avanzadas, comisiones reducidas
 * y herramientas de Smart Host DJ/MC.
 */
@Component({
  selector: 'app-saas-plans',
  imports: [],
  templateUrl: './saas-plans.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaasPlansComponent {
  /**
   * Inicia el proceso de suscripción a un plan SaaS.
   *
   * @param {number} planId - Identificador del plan seleccionado.
   * @returns {void}
   */
  onSubscribe(planId: number): void {
    // Contratar suscripción recurrente
  }
}
