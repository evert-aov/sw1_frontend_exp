import { HttpErrorResponse } from '@angular/common/http';

export interface HttpDiagnostics {
  code: string | null;
  requestId: string | null;
}

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_.-]{0,79}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extracts safe diagnostic identifiers without changing the legacy user-facing error mapping. */
export function extractHttpDiagnostics(err: HttpErrorResponse): HttpDiagnostics {
  const body =
    err.error && typeof err.error === 'object' ? (err.error as Record<string, unknown>) : {};
  const rawCode = typeof body['code'] === 'string' ? body['code'].trim().toUpperCase() : '';
  const bodyRequestId =
    typeof body['request_id'] === 'string' && body['request_id'].trim()
      ? body['request_id'].trim()
      : '';
  const headerRequestId = err.headers.get('X-Request-ID')?.trim() ?? '';
  const requestId = REQUEST_ID_PATTERN.test(bodyRequestId)
    ? bodyRequestId
    : REQUEST_ID_PATTERN.test(headerRequestId)
      ? headerRequestId
      : '';

  return {
    code: ERROR_CODE_PATTERN.test(rawCode) ? rawCode : null,
    requestId: requestId || null,
  };
}

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
  fallbackKey = 'exp.alert.errorDefault',
): { message: string; requiresAuth: boolean } {
  const rawDetail = typeof err.error?.detail === 'string' ? err.error.detail : '';
  const lowerDetail = rawDetail.toLowerCase();

  const isTechnicalAuthError =
    err.status === 401 ||
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
