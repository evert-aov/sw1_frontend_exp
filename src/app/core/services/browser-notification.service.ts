import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';

interface BackendNotice {
  id: string;
  kind: string;
  message: string;
  read_at: string | null;
}

export interface InAppNotificationToast {
  id: string;
  title: string;
  body: string;
  url: string;
}

const NOTICE_TITLES: Record<string, string> = {
  BOOKING_CONFIRMED: '¡Reserva confirmada!',
  NEW_BOOKING_HOST: 'Nueva reserva en tu evento',
  EVENT_STARTED: '¡Tu evento acaba de comenzar!',
  EVENT_FINISHED: 'Evento finalizado',
  EVENT_CANCELLED: 'Evento cancelado',
  QUORUM_CONFIRMED: '¡Evento confirmado (quórum alcanzado)!',
  GROUP_CONFIRMED: '¡Grupo de matching confirmado!',
  GROUP_EXPIRED: 'Grupo de matching vencido',
  REFUND_PROCESSED: 'Reembolso procesado',
};

/**
 * Servicio de notificaciones del navegador (primer plano con toast + sistema operativo
 * y segundo plano vía Service Worker) para avisos de reservas, quórum, eventos y MC.
 */
@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private seenIds = new Set<string>();
  private initializedPoll = false;
  private permissionListenerBound = false;

  readonly toasts = signal<InAppNotificationToast[]>([]);

  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported) return 'unsupported';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  dismissToast(id: string): void {
    this.toasts.update((list) => list.filter((item) => item.id !== id));
  }

  notify(title: string, body: string, url = '/notifications'): void {
    if (typeof window === 'undefined') return;

    // 1. Primer plano: mostrar banner editorial dentro de la web si la pestaña está visible
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.toasts.update((list) => [{ id: toastId, title, body, url }, ...list].slice(0, 4));
      setTimeout(() => this.dismissToast(toastId), 7_000);
    }

    // 2. Sistema operativo (primer y segundo plano): Service Worker o Web Notification API
    if (!this.isSupported || Notification.permission !== 'granted') return;

    const options: NotificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      silent: false,
      data: { url },
    };

    if (this.swRegistration) {
      this.swRegistration.showNotification(title, options).catch(() => {
        this.fallbackWindowNotification(title, options);
      });
      return;
    }

    this.fallbackWindowNotification(title, options);
  }

  private fallbackWindowNotification(title: string, options: NotificationOptions): void {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      // Ignorar si el navegador exige Service Worker o bloquea la notificación
    }
  }

  /** Inicia vigilancia (cada 10 s) y registra el Service Worker para avisos en primer y segundo plano. */
  startPolling(): void {
    if (this.pollTimer || typeof window === 'undefined') return;

    this.registerServiceWorker();
    this.bindPermissionRequestOnGesture();

    this.checkNotifications();
    this.pollTimer = setInterval(() => this.checkNotifications(), 10_000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkNotifications();
      }
    });
    window.addEventListener('focus', () => this.checkNotifications());
  }

  private registerServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        this.swRegistration = reg;
      })
      .catch(() => {
        // En entornos sin HTTPS/localhost o pruebas unitarias se usa el fallback
      });
  }

  private bindPermissionRequestOnGesture(): void {
    if (this.permissionListenerBound || !this.isSupported || Notification.permission !== 'default') {
      return;
    }
    this.permissionListenerBound = true;
    const handler = () => {
      if (!this.auth.isLoggedIn()) return;
      window.removeEventListener('click', handler, true);
      void this.requestPermission();
    };
    window.addEventListener('click', handler, true);
  }

  private checkNotifications(): void {
    if (!this.auth.isLoggedIn()) {
      this.seenIds.clear();
      this.initializedPoll = false;
      return;
    }

    if (this.isSupported && Notification.permission === 'default') {
      this.bindPermissionRequestOnGesture();
    }

    this.http
      .get<BackendNotice[]>(`${API_CONFIG.baseUrl}/notifications`, {
        params: { limit: 15, offset: 0 },
      })
      .subscribe({
        next: (items) => {
          if (!this.initializedPoll) {
            for (const item of items) this.seenIds.add(item.id);
            this.initializedPoll = true;
            return;
          }
          for (const item of items) {
            if (!this.seenIds.has(item.id)) {
              this.seenIds.add(item.id);
              if (!item.read_at) {
                const title = NOTICE_TITLES[item.kind] ?? 'EXPERIENCIA';
                this.notify(title, item.message, '/notifications');
              }
            }
          }
        },
        error: () => {
          // Silencioso si no hay red o sesión expiró
        },
      });
  }
}
