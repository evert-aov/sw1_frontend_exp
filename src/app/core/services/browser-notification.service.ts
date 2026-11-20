import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';

interface BackendNotice {
  id: string;
  kind: string;
  message: string;
  read_at: string | null;
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
 * Servicio de notificaciones nativas del navegador (Web Notification API)
 * para avisos de reservas, inicio/fin de eventos, quórum, MC y DJ Autónomo.
 */
@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private seenIds = new Set<string>();
  private initializedPoll = false;

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

  notify(title: string, body: string): void {
    if (!this.isSupported || Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        silent: false,
      });
    } catch {
      // Ignorar si el navegador bloquea la notificación
    }
  }

  /** Inicia vigilancia ligera (cada 25 s) de nuevos avisos del backend para notificar en el navegador. */
  startPolling(): void {
    if (this.pollTimer || typeof window === 'undefined') return;
    this.checkNotifications();
    this.pollTimer = setInterval(() => this.checkNotifications(), 25_000);
  }

  private checkNotifications(): void {
    if (!this.auth.isLoggedIn()) {
      this.seenIds.clear();
      this.initializedPoll = false;
      return;
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
                this.notify(title, item.message);
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
