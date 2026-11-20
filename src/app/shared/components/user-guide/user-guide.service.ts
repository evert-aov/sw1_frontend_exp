import { Injectable, signal } from '@angular/core';

/**
 * Servicio global para controlar la visibilidad del Manual Agéntico
 * y el botón lanzador flotante en toda la plataforma EXPERIENCIA.
 */
@Injectable({
  providedIn: 'root',
})
export class UserGuideService {
  private readonly HIDDEN_KEY = 'experiencia_guide_launcher_hidden';

  readonly isOpen = signal<boolean>(false);
  readonly isLauncherHidden = signal<boolean>(this.readHiddenPreference());

  openGuide(): void {
    this.isOpen.set(true);
  }

  closeGuide(): void {
    this.isOpen.set(false);
  }

  toggleGuide(): void {
    this.isOpen.update((open) => !open);
  }

  hideLauncher(): void {
    this.isOpen.set(false);
    this.isLauncherHidden.set(true);
    this.writeHiddenPreference(true);
  }

  showLauncher(): void {
    this.isLauncherHidden.set(false);
    this.writeHiddenPreference(false);
  }

  private readHiddenPreference(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(this.HIDDEN_KEY) === 'true';
  }

  private writeHiddenPreference(hidden: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.HIDDEN_KEY, hidden ? 'true' : 'false');
  }
}
