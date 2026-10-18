import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * HU-07: Calcula la comisión escalonada de plataforma según el precio de la entrada.
   * Reglas de negocio:
   * - Precio < 100 BOB: 10% de comisión (Tarifa estándar)
   * - Precio entre 100 y 300 BOB: 8% de comisión (Tarifa intermedia)
   * - Precio > 300 BOB: 5% de comisión (Tarifa preferencial para eventos de alto valor)
   *
   * @param {number} price - Precio fijado por cupo/entrada en BOB.
   * @returns {CommissionBreakdown} Desglose completo de tarifa porcentual, monto retenido y neto por cupo.
   */
  calculateCommission(price: number): CommissionBreakdown {
    const validPrice = Math.max(0, Number(price) || 0);
    let rate = 0.1;
    let tierKey = 'exp.breakdown.tierLow';

    if (validPrice > 300) {
      rate = 0.05;
      tierKey = 'exp.breakdown.tierHigh';
    } else if (validPrice >= 100) {
      rate = 0.08;
      tierKey = 'exp.breakdown.tierMid';
    }

    const feePerTicket = Math.round(validPrice * rate * 100) / 100;
    const netPerTicket = Math.round((validPrice - feePerTicket) * 100) / 100;

    return {
      price: validPrice,
      rate,
      ratePercent: Math.round(rate * 1000) / 10,
      feePerTicket,
      netPerTicket,
      tierKey,
    };
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

    if (filters?.category_id && filters.category_id > 0) {
      params = params.set('category_id', String(filters.category_id));
    }
    if (filters?.modality) {
      params = params.set('modality', filters.modality);
    }
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters?.zone?.trim()) {
      params = params.set('zone', filters.zone.trim());
    }
    if (filters?.only_open !== undefined) {
      params = params.set('only_open', String(filters.only_open));
    }
    if (filters?.max_price !== undefined && filters.max_price > 0) {
      params = params.set('max_price', String(filters.max_price));
    }

    return this.http.get<CatalogResponse>(`${this.apiUrl}/experiences/catalog`, { params });
  }

  /**
   * Obtiene la ficha detallada de una experiencia mediante su identificador numérico.
   *
   * @param {number} id - Identificador primario de la experiencia.
   * @returns {Observable<Experience>} Flujo observable con los detalles completos del evento.
   */
  getExperienceById(id: number): Observable<Experience> {
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
}
