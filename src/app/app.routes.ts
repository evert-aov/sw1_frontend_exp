import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
  // Paquete 1: Auth (pantalla dividida con pestañas login / registro)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
    ],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/profile/profile.component').then((m) => m.ProfileComponent),
  },

  // Paquete 2: Catálogo y Publicación
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/experience/catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'experiences/create',
    loadComponent: () =>
      import('./features/experience/create-experience/create-experience.component').then(
        (m) => m.CreateExperienceComponent
      ),
  },
  {
    path: 'experiences/:id',
    loadComponent: () =>
      import('./features/experience/experience-detail/experience-detail.component').then(
        (m) => m.ExperienceDetailComponent
      ),
  },

  // Paquete 3: Reservas, Tickets y SaaS
  {
    path: 'checkout/:id',
    loadComponent: () =>
      import('./features/booking/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'my-tickets',
    loadComponent: () =>
      import('./features/booking/my-tickets/my-tickets.component').then((m) => m.MyTicketsComponent),
  },
  {
    path: 'saas-plans',
    loadComponent: () =>
      import('./features/booking/saas-plans/saas-plans.component').then((m) => m.SaasPlansComponent),
  },

  // Paquete 4: Matching y Demanda
  {
    path: 'matching/:id',
    loadComponent: () =>
      import('./features/matching/matching-groups/matching-groups.component').then(
        (m) => m.MatchingGroupsComponent
      ),
  },
  {
    path: 'demand-insights',
    loadComponent: () =>
      import('./features/matching/demand-dashboard/demand-dashboard.component').then(
        (m) => m.DemandDashboardComponent
      ),
  },

  // Paquete 5: Live & Smart Host
  {
    path: 'live/:sessionId',
    loadComponent: () =>
      import('./features/live/live-host-dashboard/live-host-dashboard.component').then(
        (m) => m.LiveHostDashboardComponent
      ),
  },
  {
    path: 'live/:sessionId/assistant',
    loadComponent: () =>
      import('./features/live/dj-mc-assistant/dj-mc-assistant.component').then(
        (m) => m.DjMcAssistantComponent
      ),
  },
  {
    path: 'reports/:sessionId',
    loadComponent: () =>
      import('./features/live/post-event-report/post-event-report.component').then(
        (m) => m.PostEventReportComponent
      ),
  },
];
