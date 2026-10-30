import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { User } from '../models/user.model';
import { Experience } from '../models/experience.model';

export interface PlatformOverview {
  users: number;
  active_users: number;
  hosts: number;
  attendees: number;
  venues: number;
  experiences: number;
  paid_bookings: number;
}
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = API_CONFIG.baseUrl;
  overview(): Observable<PlatformOverview> {
    return this.http.get<PlatformOverview>(this.url + '/admin/overview');
  }
  experiences(skip = 0): Observable<Experience[]> {
    return this.http.get<Experience[]>(this.url + '/admin/experiences', {
      params: { skip, limit: 25 },
    });
  }
  users(skip = 0): Observable<User[]> {
    return this.http.get<User[]>(this.url + '/users', { params: { skip, limit: 25 } });
  }
  assignRoles(id: string, roles: string[]): Observable<User> {
    return this.http.put<User>(this.url + '/admin/users/' + id + '/roles', { roles });
  }
}
