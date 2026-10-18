import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { MatchingGroup, UnmetDemandInsight } from '../models/matching.model';

/**
 * Servicio del dominio de Matching Grupal y Prospección de Demanda (CU-07, CU-08).
 * Cumple con el principio de Responsabilidad Única (SRP) permitiendo a los usuarios
 * consolidar grupos para alcanzar el quórum mínimo viable y a los anfitriones detectar
 * demanda insatisfecha por zonas urbanas.
 */
@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * CU-07: Postula al usuario autenticado a un grupo de matching para una experiencia específica.
   * Si se alcanza el cupo mínimo requerido, el grupo se confirma y se emiten las reservas.
   *
   * @param {number} experienceId - Identificador de la experiencia postulada.
   * @returns {Observable<MatchingGroup>} Flujo observable con el estado consolidado del grupo.
   */
  applyForMatching(experienceId: number): Observable<MatchingGroup> {
    return this.http.post<MatchingGroup>(`${this.apiUrl}/matching/${experienceId}/apply`, {});
  }

  /**
   * Consulta el progreso y estado de conformación del grupo de matching de una experiencia.
   *
   * @param {number} experienceId - Identificador de la experiencia.
   * @returns {Observable<MatchingGroup>} Flujo observable con el porcentaje y conteo de miembros.
   */
  getGroupStatus(experienceId: number): Observable<MatchingGroup> {
    return this.http.get<MatchingGroup>(`${this.apiUrl}/matching/${experienceId}`);
  }

  /**
   * CU-08: Consulta las métricas de demanda insatisfecha agregadas por zona geográfica.
   * Permite a anfitriones y locales planificar experiencias según el interés de mercado insatisfecho.
   *
   * @param {string} [zone] - Filtro opcional por zona o barrio urbano (ej. 'Equipetrol').
   * @returns {Observable<UnmetDemandInsight[]>} Flujo observable con los insights analíticos de demanda.
   */
  getDemandInsights(zone?: string): Observable<UnmetDemandInsight[]> {
    let params = new HttpParams();
    if (zone?.trim()) {
      params = params.set('zone', zone.trim());
    }
    return this.http.get<UnmetDemandInsight[]>(`${this.apiUrl}/demand-insights`, { params });
  }
}
