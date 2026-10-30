import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Category } from '../models/category.model';
import { Venue } from '../models/venue.model';
import {
  CatalogFilters,
  CatalogResponse,
  CreateExperiencePayload,
  Experience,
} from '../models/experience.model';

/**
 * Desglose financiero y comisiones calculadas de una experiencia según HU-07.
 */
export interface CommissionBreakdown {
  /** Precio unitario por cupo en BOB */
  price: number;
  /** Tasa de comisión decimal (0.10, 0.08 o 0.05) */
  rate: number;
  /** Porcentaje legible de comisión (10%, 8% o 5%) */
  ratePercent: number;
  /** Tarifa de plataforma retenida por cada entrada vendida */
  feePerTicket: number;
  /** Ingreso neto recibido por el anfitrión por cada entrada vendida */
  netPerTicket: number;
  /** Clave de traducción del escalón arancelario */
  tierKey: string;
}

/**
 * Servicio del dominio de Experiencias y Catálogo (CU-03, CU-04).
 * Cumple con el principio de Responsabilidad Única (SRP) aislando la lógica
 * de negocio de eventos, cálculo de comisiones escalonadas y comunicación con FastAPI.
 */
@Injectable({
  providedIn: 'root',
})
export class ExperienceService {
  private readonly searchSession = crypto.randomUUID();
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  getMyExperiences(): Observable<HostedExperience[]> {
    return this.http.get<HostedExperience[]>(`${this.apiUrl}/experiences/me/hosted`);
  }
  getMyExperience(id: string): Observable<HostedExperience> {
    return this.http.get<HostedExperience>(`${this.apiUrl}/experiences/me/hosted/${id}`);
  }
  updateExperience(
    id: string,
    payload: Omit<
      CreateExperiencePayload,
      'category_id' | 'cover_image_url' | 'venue_id' | 'virtual_meeting_url'
    > & {
      cover_image_url?: string | null;
      venue_id?: string | null;
      virtual_meeting_url?: string | null;
    },
  ): Observable<Experience> {
    return this.http.put<Experience>(`${this.apiUrl}/experiences/${id}`, payload);
  }
  deleteExperience(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/experiences/${id}`);
  }
  getMyVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/venues/me/owned`);
  }
  saveVenue(payload: VenuePayload, id?: string): Observable<Venue> {
    return id
      ? this.http.put<Venue>(`${this.apiUrl}/venues/${id}`, payload)
      : this.http.post<Venue>(`${this.apiUrl}/venues`, payload);
  }

  /**
   * CU-03 / HU-04: Publica una nueva experiencia en el backend FastAPI.
   * Registra la información básica, logística y esquema de aforo/precios.
   *
   * @param {CreateExperiencePayload} payload - Datos completos recopilados en el asistente de publicación.
   * @returns {Observable<Experience>} Flujo observable con la entidad de la experiencia persistida en base de datos.
   */
  createExperience(payload: CreateExperiencePayload): Observable<Experience> {
    return this.http.post<Experience>(`${this.apiUrl}/experiences`, payload);
  }

  /**
   * CU-04 / HU-05: Consulta y filtra el catálogo de experiencias disponibles desde FastAPI.
   * Admite criterios de búsqueda por texto, categoría, modalidad, zona y aforo disponible.
   *
   * @param {CatalogFilters} [filters] - Criterios opcionales de búsqueda y segmentación.
   * @returns {Observable<CatalogResponse>} Flujo observable con la lista de eventos y total disponible.
   */
  getCatalog(filters?: CatalogFilters): Observable<CatalogResponse> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<CatalogResponse>(`${this.apiUrl}/experiences/catalog`, {
      params,
      headers: { 'X-Search-Session': this.searchSession },
    });
  }

  /**
   * Obtiene la ficha detallada de una experiencia mediante su identificador UUID.
   *
   * @param {string} id - Identificador primario de la experiencia (UUID).
   * @returns {Observable<Experience>} Flujo observable con los detalles completos del evento.
   */
  getExperienceById(id: string): Observable<Experience> {
    return this.http.get<Experience>(`${this.apiUrl}/experiences/${id}`);
  }

  /**
   * Obtiene el listado de categorías temáticas oficiales registradas en el backend.
   *
   * @returns {Observable<Category[]>} Flujo observable con el listado de categorías.
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Obtiene la lista de establecimientos y sedes físicas aliadas disponibles para reservas.
   *
   * @returns {Observable<Venue[]>} Flujo observable con los establecimientos registrados.
   */
  getVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/venues`);
  }

  /** Consulta la política de comisión del servidor; no duplica escalones en el navegador. */
  getCommissionQuote(price: number): Observable<CommissionBreakdown> {
    return this.http
      .get<{
        unit_price: number;
        commission_rate: number;
        fee_per_ticket: number;
        net_per_ticket: number;
        tier: string;
      }>(`${this.apiUrl}/experiences/commission-quote`, { params: { price } })
      .pipe(
        map((quote) => ({
          price: quote.unit_price,
          rate: quote.commission_rate,
          ratePercent: quote.commission_rate * 100,
          feePerTicket: quote.fee_per_ticket,
          netPerTicket: quote.net_per_ticket,
          tierKey: (
            {
              LOW: 'exp.breakdown.tierLow',
              MID: 'exp.breakdown.tierMid',
              HIGH: 'exp.breakdown.tierHigh',
            } as Record<string, string>
          )[quote.tier],
        })),
      );
  }
}

export interface HostedExperience extends Experience {
  can_edit: boolean;
  can_delete: boolean;
  held_slots: number;
  management_lock_reason?: string;
}
export interface VenuePayload {
  name: string;
  address?: string | null;
  city: string;
  zone?: string | null;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  phone?: string | null;
}
