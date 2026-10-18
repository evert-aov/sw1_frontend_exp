import { Injectable, signal } from '@angular/core';
import { Language, translations } from '../i18n/translations';

/**
 * Servicio de Internacionalización (i18n) para soporte multiidioma reactivo.
 * Cumple con el principio de Responsabilidad Única (SRP) administrando el diccionario
 * de traducciones en memoria, persistencia en localStorage y detección de idioma del navegador.
 */
@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly LANG_KEY = 'experiencia_lang';

  /** Señal reactiva que contiene el idioma actualmente activo ('es' | 'en') */
  readonly currentLang = signal<Language>('es');

  constructor() {
    this.initLanguage();
  }

  /**
   * Inicializa el idioma de la aplicación al arrancar.
   * Prioriza la configuración previamente guardada por el usuario en localStorage;
   * si no existe, toma como referencia el idioma preferido en el navegador.
   *
   * @private
   * @returns {void}
   */
  private initLanguage(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem(this.LANG_KEY) as Language | null;
      if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
        this.currentLang.set(savedLang);
      } else {
        const browserLang = navigator.language.startsWith('es') ? 'es' : 'en';
        this.currentLang.set(browserLang);
      }
    }
  }

  /**
   * Cambia el idioma activo de la aplicación y persiste la selección en localStorage.
   *
   * @param {Language} lang - Código de idioma a activar ('es' para español, 'en' para inglés).
   * @returns {void}
   */
  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.LANG_KEY, lang);
    }
  }

  /**
   * Alterna de manera cíclica entre español e inglés.
   *
   * @returns {void}
   */
  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'es' ? 'en' : 'es');
  }

  /**
   * Traduce una clave semántica de forma síncrona consultando el diccionario del idioma activo.
   * Si la clave no está registrada en el diccionario, retorna la propia clave como fallback seguro.
   *
   * @param {string} key - Clave del mensaje traducido (ej. 'nav.catalog', 'exp.form.title').
   * @returns {string} El texto traducido correspondiente.
   */
  translate(key: string): string {
    const lang = this.currentLang();
    const dictionary = translations[lang];
    return dictionary[key] ?? key;
  }
}
