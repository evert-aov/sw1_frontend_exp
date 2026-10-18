import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardián de rutas protegidas para usuarios autenticados.
 *
 * Bloquea el acceso a rutas privadas (ej. perfil, checkout)
 * y redirige a `/auth/login` preservando la URL original en `returnUrl`.
 *
 * @param {_route} _route - Snapshot de la ruta activada.
 * @param {state} state - Estado del router con la URL solicitada.
 * @returns {boolean | UrlTree} True si está autenticado o UrlTree para redirección.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Guardián de rutas exclusivas para usuarios con rol Anfitrión (HOST o ADMIN).
 * Si el usuario es Asistente (ATTENDEE), no le permite operar paneles de anfitrión.
 *
 * @param {_route} _route - Snapshot de la ruta activada.
 * @param {state} state - Estado del router con la URL solicitada.
 * @returns {boolean | UrlTree} True si es anfitrión, o UrlTree para redirección.
 */
export const hostGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  if (auth.isAttendee()) {
    return router.createUrlTree(['/experiences/create']);
  }

  return true;
};

/**
 * Guardián de rutas exclusivas para visitantes no autenticados.
 *
 * Evita que usuarios con sesión activa ingresen nuevamente a `/auth/login` o `/auth/register`,
 * redirigiéndolos automáticamente al catálogo general.
 *
 * @returns {boolean | UrlTree} True si es visitante o UrlTree hacia `/catalog`.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/catalog']) : true;
};
