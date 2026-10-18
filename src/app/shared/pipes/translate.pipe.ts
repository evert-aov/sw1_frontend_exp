import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/**
 * Pipe de transformación para internacionalización reactiva.
 * Permite traducir claves semánticas directamente en las plantillas HTML:
 * `{{ 'exp.form.title' | translate }}`
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Permite re-renderizado automático reactivo al alternar idioma en I18nService
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  /**
   * Transforma una clave de traducción en su texto localizado correspondiente.
   *
   * @param {string} key - Clave del mensaje en el diccionario de idiomas.
   * @returns {string} Texto traducido al idioma activo.
   */
  transform(key: string): string {
    return this.i18n.translate(key);
  }
}
