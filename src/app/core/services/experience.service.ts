import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  Category,
  CatalogFilters,
  CatalogResponse,
  CreateExperiencePayload,
  Experience,
  Venue,
} from '../models/models';

export interface CommissionBreakdown {
  price: number;
  rate: number;
  ratePercent: number;
  feePerTicket: number;
  netPerTicket: number;
  tierKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExperienceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  /**
   * HU-07: Cálculo de comisión escalonada de EXPERIENCIA
   * - Precio < 100 BOB: 10% comisión
   * - Precio 100..300 BOB: 8% comisión
   * - Precio > 300 BOB: 5% comisión (Alto valor / VIP)
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
   * CU-03 / HU-04: Publicar nueva experiencia en FastAPI
   */
  createExperience(payload: CreateExperiencePayload): Observable<Experience> {
    return this.http.post<Experience>(`${this.apiUrl}/experiences`, payload);
  }

  /**
   * CU-04 / HU-05: Explorar y filtrar catálogo desde FastAPI
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
   * Obtener detalle de una experiencia por su ID
   */
  getExperienceById(id: number): Observable<Experience> {
    return this.http.get<Experience>(`${this.apiUrl}/experiences/${id}`);
  }

  /**
   * Obtener categorías temáticas registradas en la base de datos
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Obtener establecimientos registrados en la base de datos
   */
  getVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/venues`);
  }
}
