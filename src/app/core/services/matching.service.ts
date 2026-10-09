import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { MatchingGroup, UnmetDemandInsight } from '../models/models';

// Servicio de matching grupal y prospección de demanda: únicamente firmas de métodos (CU-07, CU-08)
@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private apiUrl = 'http://localhost:8000/api';

  applyForMatching(experienceId: number): Observable<MatchingGroup> {
    // Firma para postular a matching grupal
    return EMPTY;
  }

  getGroupStatus(experienceId: number): Observable<MatchingGroup> {
    // Firma para consultar estado de quórum
    return EMPTY;
  }

  getDemandInsights(zone: string): Observable<UnmetDemandInsight[]> {
    // Firma para mapa de demanda urbana
    return EMPTY;
  }
}
