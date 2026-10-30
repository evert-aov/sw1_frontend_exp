import { Routes } from '@angular/router';
import {
  authGuard,
  guestGuard,
  venueGuard,
  hostGuard,
  attendeeGuard,
  adminGuard,
  publicCatalogGuard,
  homeRedirect,
} from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'access',
    loadComponent: () =>
      import('./features/auth/access/access.component').then((m) => m.AccessComponent),
  },
  {
    path: 'host',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/host/host-dashboard.component').then((m) => m.HostDashboardComponent),
  },
  {
    path: 'host/venues',
    canActivate: [hostGuard],
    loadComponent: () => import('./features/host/venues.component').then((m) => m.VenuesComponent),
  },
  {
    path: 'host/operations',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/host/host-operations.component').then((m) => m.HostOperationsComponent),
  },
  {
    path: 'host/experiences/:id/edit',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/experience/create-experience/create-experience.component').then(
        (m) => m.CreateExperienceComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
  },

  { path: '', redirectTo: homeRedirect, pathMatch: 'full' },
  // Paquete 1: Auth (pantalla dividida con pestañas login / registro)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
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
    canActivate: [publicCatalogGuard],
    loadComponent: () =>
      import('./features/experience/catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'experiences/create',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/experience/create-experience/create-experience.component').then(
        (m) => m.CreateExperienceComponent,
      ),
  },
  {
    path: 'experiences/:id',
    canActivate: [publicCatalogGuard],
    loadComponent: () =>
      import('./features/experience/experience-detail/experience-detail.component').then(
        (m) => m.ExperienceDetailComponent,
      ),
  },

  // Paquete 3: Reservas, Tickets y SaaS
  {
    path: 'checkout/:id',
    canActivate: [attendeeGuard],
    loadComponent: () =>
      import('./features/booking/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'my-tickets',
    canActivate: [attendeeGuard],
    loadComponent: () =>
      import('./features/booking/my-tickets/my-tickets.component').then(
        (m) => m.MyTicketsComponent,
      ),
  },
  {
    path: 'saas-plans',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/booking/saas-plans/saas-plans.component').then(
        (m) => m.SaasPlansComponent,
      ),
  },

  // Paquete 4: Matching y Demanda
  {
    path: 'matching/:id',
    canActivate: [attendeeGuard],
    loadComponent: () =>
      import('./features/matching/matching-groups/matching-groups.component').then(
        (m) => m.MatchingGroupsComponent,
      ),
  },
  {
    path: 'demand-insights',
    canActivate: [venueGuard],
    loadComponent: () =>
      import('./features/matching/demand-dashboard/demand-dashboard.component').then(
        (m) => m.DemandDashboardComponent,
      ),
  },

  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },

  // Paquete 5: Live & Smart Host
  {
    path: 'live/:sessionId',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/live/live-host-dashboard/live-host-dashboard.component').then(
        (m) => m.LiveHostDashboardComponent,
      ),
  },
  {
    path: 'live/:sessionId/assistant',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/live/dj-mc-assistant/dj-mc-assistant.component').then(
        (m) => m.DjMcAssistantComponent,
      ),
  },
  {
    path: 'reports/:sessionId',
    canActivate: [hostGuard],
    loadComponent: () =>
      import('./features/live/post-event-report/post-event-report.component').then(
        (m) => m.PostEventReportComponent,
      ),
  },
];
