import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor HTTP de Autenticación JWT.
 *
 * Responsabilidades:
 * - Adjuntar de manera transparente la cabecera `Authorization: Bearer <token>`
 *   en todas las solicitudes salientes si existe una sesión activa.
 * - Detectar respuestas `401 Unauthorized` provenientes del backend FastAPI,
 *   invalidando la sesión local y redirigiendo al login.
 *
 * @param {HttpRequest<unknown>} req - Solicitud HTTP interceptada.
 * @param {HttpHandlerFn} next - Función continuadora del flujo HTTP.
 * @returns {Observable<HttpEvent<unknown>>} Flujo observable de la petición procesada.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
