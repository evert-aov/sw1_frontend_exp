/**
 * @fileoverview Modelos de dominio y contratos de experiencias/eventos (CU-03, CU-04).
 * Responsabilidad: Definir la entidad Experiencia, modalidades, estados y filtros de búsqueda.
 */

/**
 * Modalidad de realización de la experiencia.
 */
export type Modality = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';

/**
 * Ciclo de vida y estado actual de la experiencia.
 */
export type ExperienceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CONFIRMED'
  | 'LIVE'
  | 'FINISHED'
  | 'CANCELLED';

/**
 * Entidad principal de una Experiencia en el ecosistema.
 */
export interface Experience {
  /** Identificador único */
  id: number;
  /** Identificador del anfitrión organizador */
  host_id: number;
  /** Nombre del anfitrión */
  host_name?: string;
  /** Identificador de categoría temática */
  category_id: number;
  /** Nombre de categoría */
  category_name?: string;
  /** Identificador de sede asignada (si aplica) */
  venue_id?: number;
  /** Nombre del establecimiento o local */
  venue_name?: string;
  /** Zona o barrio urbano */
  zone?: string;
  /** Dirección física */
  address?: string;
  /** Título de la experiencia */
  title: string;
  /** Descripción detallada y propuesta de valor */
  description: string;
  /** URL de imagen de portada */
  cover_image_url?: string;
  /** Modalidad (Presencial, Virtual o Híbrida) */
  modality: Modality;
  /** Estado del evento en el ciclo de vida */
  status: ExperienceStatus;
  /** Precio por cupo en moneda local (BOB / Bs) */
  price: number;
  /** Aforo mínimo viable indispensable para confirmar */
  min_capacity: number;
  /** Capacidad máxima permitida */
  max_capacity: number;
  /** Cantidad actual de cupos reservados/pagados */
  reserved_slots: number;
  /** Fecha y hora del evento en formato ISO 8601 */
  event_date: string;
  /** Duración estimada en minutos */
  duration_minutes: number;
  /** Enlace a la sala virtual para eventos virtuales o híbridos */
  virtual_meeting_url?: string;
  /** Flag indicador de si se alcanzó el quórum mínimo viable */
  is_quorum_reached: boolean;
  /** Fecha de creación en el sistema */
  created_at: string;
}

/**
 * Carga útil para crear una nueva experiencia desde el wizard de anfitrión (CU-03 / HU-04).
 */
export interface CreateExperiencePayload {
  /** Categoría temática seleccionada */
  category_id: number;
  /** Identificador de sede (opcional) */
  venue_id?: number;
  /** Nombre del establecimiento */
  venue_name?: string;
  /** Zona o barrio */
  zone?: string;
  /** Dirección física */
  address?: string;
  /** Título de la experiencia */
  title: string;
  /** Descripción del evento */
  description: string;
  /** URL de portada opcional */
  cover_image_url?: string;
  /** Modalidad elegida */
  modality: Modality;
  /** Precio por cupo */
  price: number;
  /** Cupo mínimo viable */
  min_capacity: number;
  /** Capacidad máxima */
  max_capacity: number;
  /** Fecha y hora combinada en ISO */
  event_date: string;
  /** Duración en minutos */
  duration_minutes: number;
  /** Enlace de sala virtual */
  virtual_meeting_url?: string;
}

/**
 * Criterios de filtrado para exploración del catálogo (CU-04 / HU-05).
 */
export interface CatalogFilters {
  /** Filtrar por ID de categoría temática */
  category_id?: number;
  /** Filtrar por modalidad */
  modality?: Modality | '';
  /** Búsqueda por texto libre en título, descripción o local */
  search?: string;
  /** Filtrar por zona urbana */
  zone?: string;
  /** Excluir eventos llenos o cancelados */
  only_open?: boolean;
  /** Tope máximo de precio */
  max_price?: number;
}

/**
 * Respuesta paginada o agregada del catálogo devuelta por FastAPI.
 */
export interface CatalogResponse {
  /** Total de registros encontrados */
  total: number;
  /** Lista de experiencias obtenidas */
  experiences: Experience[];
}
