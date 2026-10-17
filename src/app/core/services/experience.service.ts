import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Experience, Category, Venue } from '../models/models';

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
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api';
  private readonly STORAGE_KEY = 'experiencia_published_events';

  // Categorías base del sistema
  private defaultCategories: Category[] = [
    { id: 1, name: 'Cocina & Repostería', description: 'Talleres prácticos de cocina, masas y postres', icon_name: 'utensils' },
    { id: 2, name: 'Catas & Barismo', description: 'Degustación de café de especialidad y vinos de altura', icon_name: 'coffee' },
    { id: 3, name: 'Arte & Pintura', description: 'Pintura al óleo, acuarela y cerámica artesanal', icon_name: 'palette' },
    { id: 4, name: 'Coctelería & Mixología', description: 'Creación de cócteles botánicos y destilados', icon_name: 'glass' },
    { id: 5, name: 'Talleres Creativos', description: 'Carpintería, velas aromáticas y macramé', icon_name: 'tools' },
    { id: 6, name: 'Música & Danza', description: 'Percusión, jazz en vivo y ritmos urbanos', icon_name: 'music' },
  ];

  // Experiencias semilla iniciales para dar vida al catálogo
  private initialExperiences: Experience[] = [
    {
      id: 101,
      host_id: 2,
      category_id: 1,
      category_name: 'Cocina & Repostería',
      venue_name: 'La Rustika Panadería',
      zone: 'Equipetrol',
      address: 'Calle Los Tajibos #142',
      title: 'Masterclass de Masa Madre y Focaccias Artesanales',
      description: 'Aprende los secretos del fermento natural, técnicas de hidratación al 80% y horneado en piedra viva. Te llevas tu propio pan y frasco de masa madre de 5 años.',
      cover_image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      modality: 'IN_PERSON',
      status: 'OPEN',
      price: 180,
      min_capacity: 6,
      max_capacity: 12,
      reserved_slots: 4,
      event_date: '2026-11-15T16:00:00Z',
      duration_minutes: 180,
      is_quorum_reached: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      host_id: 2,
      category_id: 2,
      category_name: 'Catas & Barismo',
      venue_name: 'Café Typica Centro',
      zone: 'Centro Histórico',
      address: 'Calle 24 de Septiembre #350',
      title: 'Cata Sensorial de Cafés de Altura de Caranavi',
      description: 'Descubre perfiles de taza geisha, borbón y típica mediante rueda de aromas SCAA. Incluye maridaje con chocolates de origen amazónico.',
      cover_image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
      modality: 'IN_PERSON',
      status: 'OPEN',
      price: 95,
      min_capacity: 8,
      max_capacity: 15,
      reserved_slots: 7,
      event_date: '2026-11-18T18:30:00Z',
      duration_minutes: 120,
      is_quorum_reached: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 103,
      host_id: 3,
      category_id: 3,
      category_name: 'Arte & Pintura',
      venue_name: 'Estudio Botánico Urubó',
      zone: 'Urubó',
      address: 'Av. Principal #45',
      title: 'Pintura al Óleo & Vino al Atardecer',
      description: 'Una velada descontracturada donde guiados por una artista plástica pintarás tu propio lienzo en formato mediano mientras disfrutas de una copa de vino.',
      cover_image_url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=80',
      modality: 'IN_PERSON',
      status: 'CONFIRMED',
      price: 220,
      min_capacity: 5,
      max_capacity: 10,
      reserved_slots: 6,
      event_date: '2026-11-20T17:00:00Z',
      duration_minutes: 150,
      is_quorum_reached: true,
      created_at: new Date().toISOString(),
    },
  ];

  constructor() {
    this.ensureLocalStorageInitialized();
  }

  private ensureLocalStorageInitialized(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.initialExperiences));
      }
    }
  }

  // HU-07: Cálculo de comisión escalonada de EXPERIENCIA
  // - Precio < 100 BOB: 10% comisión
  // - Precio 100..300 BOB: 8% comisión
  // - Precio > 300 BOB: 5% comisión (Alto valor / VIP)
  calculateCommission(price: number): CommissionBreakdown {
    const validPrice = Math.max(0, Number(price) || 0);
    let rate = 0.10;
    let tierKey = 'exp.breakdown.tierLow';

    if (validPrice > 300) {
      rate = 0.05;
      tierKey = 'exp.breakdown.tierHigh';
    } else if (validPrice >= 100) {
      rate = 0.08;
      tierKey = 'exp.breakdown.tierMid';
    }

    const feePerTicket = Math.round((validPrice * rate) * 100) / 100;
    const netPerTicket = Math.round((validPrice - feePerTicket) * 100) / 100;

    return {
      price: validPrice,
      rate,
      ratePercent: Math.round(rate * 100),
      feePerTicket,
      netPerTicket,
      tierKey,
    };
  }

  // CU-04 / HU-04: Publicar nueva experiencia
  createExperience(data: Partial<Experience>): Observable<Experience> {
    const list = this.getStoredExperiences();
    const newId = Date.now();
    const category = this.defaultCategories.find((c) => c.id === Number(data.category_id)) ?? this.defaultCategories[0];

    const newExperience: Experience = {
      id: newId,
      host_id: data.host_id ?? 1,
      category_id: Number(data.category_id) || category.id,
      category_name: category.name,
      venue_name: data.venue_name || (data.modality === 'VIRTUAL' ? 'Online / Google Meet' : 'Establecimiento Local'),
      zone: data.zone || 'Equipetrol',
      address: data.address || '',
      title: data.title?.trim() || 'Nueva Experiencia',
      description: data.description?.trim() || '',
      cover_image_url:
        data.cover_image_url?.trim() ||
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
      modality: data.modality ?? 'IN_PERSON',
      status: 'OPEN',
      price: Number(data.price) || 0,
      min_capacity: Number(data.min_capacity) || 5,
      max_capacity: Number(data.max_capacity) || 12,
      reserved_slots: 0,
      event_date: data.event_date || new Date(Date.now() + 86400000 * 7).toISOString(),
      duration_minutes: Number(data.duration_minutes) || 120,
      virtual_meeting_url: data.virtual_meeting_url || undefined,
      is_quorum_reached: false,
      created_at: new Date().toISOString(),
    };

    // Intentamos guardar en Backend FastAPI si está disponible
    return this.http.post<Experience>(`${this.apiUrl}/experiences`, newExperience).pipe(
      tap((saved) => {
        const updated = [saved, ...list];
        this.saveStoredExperiences(updated);
      }),
      catchError(() => {
        // Fallback robusto en LocalStorage para garantizar que la UI nunca falle
        const updated = [newExperience, ...list];
        this.saveStoredExperiences(updated);
        return of(newExperience);
      })
    );
  }

  // CU-04 / CU-05: Listar catálogo completo
  getCatalog(filters?: { category_id?: number; modality?: string; search?: string }): Observable<{ total: number; experiences: Experience[] }> {
    return this.http.get<{ total: number; experiences: Experience[] }>(`${this.apiUrl}/experiences/catalog`).pipe(
      catchError(() => {
        let items = this.getStoredExperiences();
        if (filters?.category_id) {
          items = items.filter((x) => x.category_id === Number(filters.category_id));
        }
        if (filters?.modality) {
          items = items.filter((x) => x.modality === filters.modality);
        }
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          items = items.filter((x) => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
        }
        return of({ total: items.length, experiences: items });
      })
    );
  }

  // Lista de categorías temáticas
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      catchError(() => of(this.defaultCategories))
    );
  }

  // Obtener experiencias creadas por el anfitrión actual
  getUserPublishedExperiences(): Experience[] {
    return this.getStoredExperiences();
  }

  private getStoredExperiences(): Experience[] {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return this.initialExperiences;
        }
      }
    }
    return this.initialExperiences;
  }

  private saveStoredExperiences(experiences: Experience[]): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(experiences));
    }
  }
}
