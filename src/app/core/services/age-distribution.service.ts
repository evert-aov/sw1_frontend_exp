import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, timer } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

/**
 * Rangos etarios estimados por el backend (HU-16).
 * YOUTH: menores de 18, YOUNG_ADULT: 18 a 30, ADULT: 31 a 50, SENIOR: más de 50.
 */
export type AgeGroup = 'YOUTH' | 'YOUNG_ADULT' | 'ADULT' | 'SENIOR';

/** Participación de un rango etario dentro de la ventana deslizante de la sesión. */
export interface AgeGroupShare {
  age_group: AgeGroup;
  /** Porcentaje de 0 a 100 sobre los rostros clasificados. */
  percentage: number;
  /** Rostros clasificados en este rango dentro de la ventana. */
  count: number;
}

/** Última distribución etaria de una sesión en vivo, solo con conteos agregados. */
export interface AgeDistribution {
  session_id: string;
  window_seconds: number;
  /** Fotogramas analizados dentro de la ventana. */
  sample_count: number;
  /** Rostros acumulados por fotograma; no equivale a personas únicas. */
  detections_count: number;
  /** Siempre los cuatro rangos en orden: YOUTH, YOUNG_ADULT, ADULT, SENIOR. */
  distribution: AgeGroupShare[];
  dominant_age_group: AgeGroup | null;
  updated_at: string | null;
  /** Falso mientras el servidor no tenga un modelo de edad registrado. */
  estimator_configured: boolean;
}

/** Intervalo de consulta por defecto, alineado con el muestreo de fotogramas cada 2-3 segundos. */
export const AGE_DISTRIBUTION_REFRESH_MS = 5000;

/**
 * Servicio de la Estimación Etaria del Público en Vivo (HU-16).
 * Cumple con el principio de Responsabilidad Única (SRP) consultando exclusivamente
 * la distribución porcentual agregada; nunca envía ni recibe fotogramas.
 */
@Injectable({
  providedIn: 'root',
})
export class AgeDistributionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * HU-16: Consulta la última distribución etaria de una sesión en vivo del anfitrión autenticado.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @returns {Observable<AgeDistribution>} Flujo observable con los porcentajes por rango etario.
   */
  getLatest(sessionId: string): Observable<AgeDistribution> {
    return this.http.get<AgeDistribution>(
      `${this.apiUrl}/live/sessions/${encodeURIComponent(sessionId)}/age-distribution`,
    );
  }

  /**
   * HU-16: Consulta la distribución de inmediato y luego de forma periódica mientras haya suscriptores.
   * Una nueva consulta cancela la anterior si esta sigue pendiente.
   *
   * @param {string} sessionId - Identificador de la sesión en vivo (UUID).
   * @param {number} [periodMs=AGE_DISTRIBUTION_REFRESH_MS] - Intervalo entre consultas en milisegundos.
   * @returns {Observable<AgeDistribution>} Flujo observable que emite cada distribución recibida.
   */
  watch(sessionId: string, periodMs: number = AGE_DISTRIBUTION_REFRESH_MS): Observable<AgeDistribution> {
    return timer(0, periodMs).pipe(switchMap(() => this.getLatest(sessionId)));
  }
}
