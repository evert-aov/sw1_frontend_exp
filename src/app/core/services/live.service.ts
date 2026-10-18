import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { LiveMetrics, PostEventReport } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class LiveService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.baseUrl;
  private readonly wsUrl = API_CONFIG.wsUrl;
  private socket: WebSocket | null = null;

  connectStream(sessionId: number): Observable<LiveMetrics> {
    return new Observable<LiveMetrics>((observer) => {
      this.socket = new WebSocket(`${this.wsUrl}/${sessionId}`);

      this.socket.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data) as LiveMetrics;
          observer.next(metrics);
        } catch (err) {
          observer.error(err);
        }
      };

      this.socket.onerror = (err) => observer.error(err);
      this.socket.onclose = () => observer.complete();

      return () => {
        this.socket?.close();
        this.socket = null;
      };
    });
  }

  sendFrame(sessionId: number, frameBase64: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ session_id: sessionId, frame: frameBase64 }));
    }
  }

  getPostEventReport(sessionId: number): Observable<PostEventReport> {
    return this.http.get<PostEventReport>(`${this.apiUrl}/reports/${sessionId}`);
  }
}
