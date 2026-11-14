import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { diagnosticErrorContractV1Fixture } from './diagnostic-error-contract.fixture';
import { extractHttpDiagnostics, getFriendlyErrorMessage } from './http-error.util';

describe('http-error.util diagnostics', () => {
  it('keeps the legacy friendly message result unchanged while exposing body diagnostics', () => {
    const requestId = '123e4567-e89b-42d3-a456-426614174000';
    const error = new HttpErrorResponse({
      status: 422,
      error: { detail: 'Invalid input', code: 'COMMON.VALIDATION_ERROR', request_id: requestId },
    });
    expect(getFriendlyErrorMessage(error, (key) => key)).toEqual({
      message: 'Invalid input',
      requiresAuth: false,
    });
    expect(extractHttpDiagnostics(error)).toEqual({ code: 'COMMON.VALIDATION_ERROR', requestId });
  });

  it('reads a request ID from the response header and normalizes known codes', () => {
    const requestId = '123e4567-e89b-42d3-a456-426614174000';
    const error = new HttpErrorResponse({
      status: 500,
      headers: new HttpHeaders({ 'X-Request-ID': requestId }),
      error: { detail: 'failed', code: 'common.internal_error' },
    });
    expect(extractHttpDiagnostics(error)).toEqual({ code: 'COMMON.INTERNAL_ERROR', requestId });
  });

  it('falls back to a valid response header when the body request ID is invalid', () => {
    const requestId = '123e4567-e89b-42d3-a456-426614174000';
    const error = new HttpErrorResponse({
      status: 500,
      headers: new HttpHeaders({ 'X-Request-ID': requestId }),
      error: { detail: 'failed', code: 'COMMON.INTERNAL_ERROR', request_id: 'invalid' },
    });
    expect(extractHttpDiagnostics(error)).toEqual({ code: 'COMMON.INTERNAL_ERROR', requestId });
  });

  it('returns safe empty diagnostics for missing or unknown values without throwing', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { detail: 'failed', code: { unsafe: true }, request_id: 17 },
    });
    expect(() => extractHttpDiagnostics(error)).not.toThrow();
    expect(extractHttpDiagnostics(error)).toEqual({ code: null, requestId: null });
  });

  it('consumes the shared FastAPI validation fixture without changing fallback messaging', () => {
    const error = new HttpErrorResponse({ status: 422, error: diagnosticErrorContractV1Fixture });

    expect(extractHttpDiagnostics(error)).toEqual({
      code: 'COMMON.VALIDATION_ERROR',
      requestId: diagnosticErrorContractV1Fixture.request_id,
    });
    expect(getFriendlyErrorMessage(error, (key) => `translated:${key}`)).toEqual({
      message: 'translated:exp.alert.errorDefault',
      requiresAuth: false,
    });
  });

  it('localizes the existing authentication fallback for a known provider code', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: {
        detail: 'Not authenticated',
        code: 'AUTH.UNAUTHENTICATED',
        request_id: diagnosticErrorContractV1Fixture.request_id,
      },
    });

    expect(extractHttpDiagnostics(error)).toEqual({
      code: 'AUTH.UNAUTHENTICATED',
      requestId: diagnosticErrorContractV1Fixture.request_id,
    });
    expect(getFriendlyErrorMessage(error, (key) => `translated:${key}`)).toEqual({
      message: 'translated:auth.friendlyRequiredDesc',
      requiresAuth: true,
    });
  });

  it('keeps unknown but well-formed provider codes diagnosable', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: {
        detail: 'Service temporarily unavailable',
        code: 'VENDOR.EXTERNAL_TIMEOUT',
        request_id: diagnosticErrorContractV1Fixture.request_id,
      },
    });

    expect(extractHttpDiagnostics(error)).toEqual({
      code: 'VENDOR.EXTERNAL_TIMEOUT',
      requestId: diagnosticErrorContractV1Fixture.request_id,
    });
    expect(getFriendlyErrorMessage(error, (key) => `translated:${key}`)).toEqual({
      message: 'Service temporarily unavailable',
      requiresAuth: false,
    });
  });
});
