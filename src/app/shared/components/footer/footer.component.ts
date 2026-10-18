import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Componente de Pie de Página institucional.
 * Responsabilidad: Exponer derechos de autor, enlaces informativos y versión de plataforma.
 */
@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  /** Año actual para el copyright dinámico */
  readonly year = new Date().getFullYear();
}
