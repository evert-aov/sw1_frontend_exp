import { Injectable, signal } from '@angular/core';

/**
 * Modos de color admitidos por la plataforma.
 */
export type Theme = 'light' | 'dark';

/**
 * Servicio de gestión de temas (Claro / Oscuro) con soporte para Tailwind v4.
 * Cumple con el principio de Responsabilidad Única (SRP) sincronizando la clase CSS
 * 'dark' en el elemento raíz del DOM con el almacenamiento local persistente.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'experiencia_theme';

  /** Señal reactiva que contiene el tema actual de la aplicación */
  readonly theme = signal<Theme>('light');

  constructor() {
    this.initTheme();
  }

  /**
   * Inicializa el tema visual de la aplicación.
   * Consulta localStorage y, en su defecto, evalúa la preferencia del sistema operativo (prefers-color-scheme).
   *
   * @private
   * @returns {void}
   */
  private initTheme(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }

  /**
   * Aplica un tema visual específico, actualizando las clases en `<html>` y persistiendo el valor.
   *
   * @param {Theme} newTheme - Tema a activar ('light' o 'dark').
   * @returns {void}
   */
  setTheme(newTheme: Theme): void {
    this.theme.set(newTheme);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, newTheme);
    }
  }

  /**
   * Alterna de manera binaria entre el modo claro y el modo oscuro.
   *
   * @returns {void}
   */
  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Comprueba de manera síncrona si el modo oscuro está activo.
   *
   * @returns {boolean} True si el tema actual es 'dark'.
   */
  isDark(): boolean {
    return this.theme() === 'dark';
  }
}
