import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-matching-groups',
  imports: [],
  templateUrl: './matching-groups.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingGroupsComponent {
  onJoinQuorum(): void {
    // Firma para postular al quórum de una experiencia
  }
}
