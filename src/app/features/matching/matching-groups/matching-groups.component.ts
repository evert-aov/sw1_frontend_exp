import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Componente de Gestión de Grupos de Matching (CU-07).
 *
 * Responsabilidad: Visualizar el avance de miembros agrupados para alcanzar el quórum
 * mínimo viable de experiencias en etapa de consolidación.
 */
@Component({
  selector: 'app-matching-groups',
  imports: [],
  templateUrl: './matching-groups.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingGroupsComponent {
  /**
   * Postula al usuario actual al grupo de matching seleccionado.
   *
   * @returns {void}
   */
  onJoinQuorum(): void {
    // Postulación al quórum
  }
}
