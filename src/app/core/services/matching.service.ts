import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { MatchingGroup, UnmetDemandInsight } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;

  applyForMatching(experienceId: number): Observable<MatchingGroup> {
    return this.http.post<MatchingGroup>(`${this.apiUrl}/matching/${experienceId}/apply`, {});
  }

  getGroupStatus(experienceId: number): Observable<MatchingGroup> {
    return this.http.get<MatchingGroup>(`${this.apiUrl}/matching/${experienceId}`);
  }

  getDemandInsights(zone?: string): Observable<UnmetDemandInsight[]> {
    let params = new HttpParams();
    if (zone?.trim()) {
      params = params.set('zone', zone.trim());
    }
    return this.http.get<UnmetDemandInsight[]>(`${this.apiUrl}/demand-insights`, { params });
  }
}
