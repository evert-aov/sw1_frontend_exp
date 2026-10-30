import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Refresca roles desde la API; el almacenamiento local solo sirve de caché visual. */
function authorized(state: RouterStateSnapshot, policy: (auth: AuthService) => boolean) {
  const auth = inject(AuthService),
    router = inject(Router);
  if (!auth.isLoggedIn())
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return auth.getProfile().pipe(
    map(() => (policy(auth) ? true : router.createUrlTree([auth.homeRoute()]))),
    catchError(() =>
      of(
        auth.isLoggedIn()
          ? router.createUrlTree(['/access'], { queryParams: { reason: 'connection' } })
          : router.createUrlTree(['/auth/login']),
      ),
    ),
  );
}

export const authGuard: CanActivateFn = (_, state) => authorized(state, () => true);
export const hostGuard: CanActivateFn = (_, state) => authorized(state, (auth) => auth.isHost());
export const attendeeGuard: CanActivateFn = (_, state) =>
  authorized(state, (auth) => auth.isAttendee());
export const adminGuard: CanActivateFn = (_, state) => authorized(state, (auth) => auth.isAdmin());
export const venueGuard: CanActivateFn = (_, state) =>
  authorized(state, (auth) => auth.isHost() || auth.isAdmin());

/** El catálogo sigue siendo público. Una cuenta de gestión entra a su espacio propio. */
export const publicCatalogGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? authorized(state, (auth) => auth.isAttendee()) : true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService),
    router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree([auth.homeRoute()]) : true;
};

/** Resuelve también una sesión que tiene JWT pero perdió la caché del perfil. */
export const homeRedirect: RedirectFunction = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return '/catalog';
  return auth.getProfile().pipe(
    map(() => auth.homeRoute()),
    catchError(() => of(auth.isLoggedIn() ? '/access' : '/auth/login')),
  );
};
