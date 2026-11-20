import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { UserGuideChatbotComponent } from './shared/components/user-guide/user-guide-chatbot.component';
import { ThemeService } from './core/services/theme.service';
import { BrowserNotificationService } from './core/services/browser-notification.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, UserGuideChatbotComponent, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Inyección para inicializar automáticamente el tema guardado
  private themeService = inject(ThemeService);
  private browserNotifications = inject(BrowserNotificationService);
  private router = inject(Router);

  constructor() {
    this.browserNotifications.startPolling();
  }

  // true cuando estamos en /auth/... o /home (pantalla completa con su propio layout)
  isStandalonePage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => {
        const cleanPath = e.urlAfterRedirects.split('?')[0].split('#')[0];
        return (
          cleanPath.startsWith('/auth') ||
          cleanPath.startsWith('/home') ||
          cleanPath === '/' ||
          cleanPath === ''
        );
      }),
    ),
    {
      initialValue:
        typeof window !== 'undefined'
          ? (() => {
              const p = window.location.pathname.split('?')[0].split('#')[0];
              return (
                p.startsWith('/auth') ||
                p.startsWith('/home') ||
                p === '/' ||
                p === ''
              );
            })()
          : false,
    },
  );

  // Alias para mantener compatibilidad
  isAuthPage = this.isStandalonePage;

  // true en pantallas de monitoreo en vivo para aprovechar todo el ancho del monitor
  isWidePage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => {
        const cleanPath = e.urlAfterRedirects.split('?')[0].split('#')[0];
        return cleanPath.startsWith('/live');
      }),
    ),
    {
      initialValue:
        typeof window !== 'undefined'
          ? window.location.pathname.split('?')[0].split('#')[0].startsWith('/live')
          : false,
    },
  );
}
