import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { Experience, Category } from '../models/models';

// Servicio de catálogo y publicación de experiencias: únicamente firmas de métodos (CU-03, CU-04)
@Injectable({
  providedIn: 'root',
})
export class ExperienceService {
  private apiUrl = 'http://localhost:8000/api';

  getCatalog(filters?: any): Observable<{ total: number; experiences: Experience[] }> {
    // Firma para explorar y filtrar catálogo
    return EMPTY;
  }

  getExperienceById(id: number): Observable<Experience> {
    // Firma para ver detalle de experiencia
    return EMPTY;
  }

  createExperience(experienceData: Partial<Experience>): Observable<Experience> {
    // Firma para publicar experiencia
    return EMPTY;
  }

  getCategories(): Observable<Category[]> {
    // Firma para listar categorías temáticas
    return EMPTY;
  }
}
