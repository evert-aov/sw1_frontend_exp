import { Injectable, signal } from '@angular/core';
import { Language, translations } from '../i18n/translations';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly LANG_KEY = 'experiencia_lang';

  // Estado reactivo del idioma actual
  currentLang = signal<Language>('es');

  constructor() {
    this.initLanguage();
  }

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

  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.LANG_KEY, lang);
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'es' ? 'en' : 'es');
  }

  // Traducción síncrona por clave
  translate(key: string): string {
    const lang = this.currentLang();
    const dictionary = translations[lang];
    return dictionary[key] ?? key;
  }
}
