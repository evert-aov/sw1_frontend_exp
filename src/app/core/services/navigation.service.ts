import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface NavigationItem {
  path: string;
  labelKey: string;
}

/** Una única lista de opciones para navegación de escritorio y móvil. */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly auth = inject(AuthService);
  readonly items = computed<NavigationItem[]>(() => {
    const items: NavigationItem[] = [];
    if (this.auth.isAdmin())
      items.push(
        { path: '/admin', labelKey: 'workspace.platform' },
        { path: '/admin/users', labelKey: 'workspace.users' },
      );
    if (this.auth.isHost())
      items.push(
        { path: '/host', labelKey: 'workspace.host' },
        { path: '/host/venues', labelKey: 'workspace.venues' },
        { path: '/host/operations', labelKey: 'workspace.operations' },
      );
    if (this.auth.isHost() || this.auth.isAdmin())
      items.push({ path: '/demand-insights', labelKey: 'nav.demandInsights' });
    if (this.auth.isGuest() || this.auth.isAttendee())
      items.push({ path: '/catalog', labelKey: 'nav.catalog' });
    if (this.auth.isAttendee()) items.push({ path: '/my-tickets', labelKey: 'nav.myTickets' });
    if (this.auth.isLoggedIn())
      items.push({ path: '/notifications', labelKey: 'nav.notifications' });
    return items;
  });
}
