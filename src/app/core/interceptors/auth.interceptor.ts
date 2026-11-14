import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';

const REQUEST_ID_HEADER = 'X-Request-ID';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isApiOriginRequest(url: string): boolean {
  try {
    return new URL(url).origin === new URL(API_CONFIG.baseUrl).origin;
  } catch {
    return false;
  }
}

function createRequestId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') cryptoApi.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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
  const isApiRequest =
    req.url === API_CONFIG.baseUrl || req.url.startsWith(`${API_CONFIG.baseUrl}/`);
  const isApiOrigin = isApiOriginRequest(req.url);
  const token = isApiRequest ? auth.token : null;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (isApiOrigin) {
    const suppliedId = req.headers.get(REQUEST_ID_HEADER);
    headers[REQUEST_ID_HEADER] =
      suppliedId && UUID_V4_PATTERN.test(suppliedId) ? suppliedId : createRequestId();
  }
  const authReq = Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        auth.expireSession();
      }
      return throwError(() => error);
    }),
  );
};
