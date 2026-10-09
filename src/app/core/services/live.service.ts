import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { LiveMetrics, ActionSuggestion, PostEventReport } from '../models/models';

// Servicio de streaming de video efímero, WebSockets y Smart Host (CU-09..CU-13)
@Injectable({
  providedIn: 'root',
})
export class LiveService {
  private wsUrl = 'ws://localhost:8000/api/live/ws';

  connectStream(sessionId: number): Observable<LiveMetrics> {
    // Firma para conectar canal WebSocket bidireccional
    return EMPTY;
  }

  sendFrame(sessionId: number, frameBase64: string): void {
    // Firma para transmitir frame de video ligero cada 2-3 segundos
  }

  getPostEventReport(sessionId: number): Observable<PostEventReport> {
    // Firma para consultar reporte analítico post-evento
    return EMPTY;
  }
}
