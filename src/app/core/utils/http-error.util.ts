import { HttpErrorResponse } from '@angular/common/http';

/**
 * Convierte errores técnicos del backend FastAPI (ej. "Header 'Authorization: Bearer <token>' requerido")
 * en mensajes amigables y comprensibles para el usuario final.
 *
 * @param {HttpErrorResponse} err - Error capturado de una llamada HTTP.
 * @param {(key: string) => string} translate - Función del servicio de internacionalización para traducir claves.
 * @param {string} [fallbackKey='exp.alert.errorDefault'] - Clave por defecto en caso de no hallar detalle específico.
 * @returns {{ message: string; requiresAuth: boolean }} Objeto con el mensaje amigable y bandera de autenticación requerida.
 */
export function getFriendlyErrorMessage(
  err: HttpErrorResponse,
  translate: (key: string) => string,
  fallbackKey = 'exp.alert.errorDefault'
): { message: string; requiresAuth: boolean } {
  const rawDetail = typeof err.error?.detail === 'string' ? err.error.detail : '';
  const lowerDetail = rawDetail.toLowerCase();

  const isTechnicalAuthError =
    err.status === 401 ||
    err.status === 403 ||
    lowerDetail.includes('bearer') ||
    lowerDetail.includes('token') ||
    lowerDetail.includes('authorization') ||
    lowerDetail.includes('header') ||
    lowerDetail.includes('not authenticated') ||
    lowerDetail.includes('no autenticado') ||
    lowerDetail.includes('credenciales');

  if (isTechnicalAuthError) {
    return {
      message: translate('auth.friendlyRequiredDesc'),
      requiresAuth: true,
    };
  }

  if (err.status === 0) {
    return {
      message: translate('auth.serverError'),
      requiresAuth: false,
    };
  }

  if (rawDetail && !rawDetail.includes('<') && !rawDetail.includes('Header')) {
    return {
      message: rawDetail,
      requiresAuth: false,
    };
  }

  return {
    message: translate(fallbackKey),
    requiresAuth: false,
  };
}
