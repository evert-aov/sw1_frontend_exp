// Modelos y contratos de TypeScript alineados con los esquemas Pydantic de FastAPI

export interface User {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  city?: string;
  zone?: string;
  avatar_url?: string;
  bio?: string;
  interests: string[];
  roles: string[];
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  roles: string[];
}

export type UserRole = 'ATTENDEE' | 'HOST' | 'VENUE';

export interface RegisterRequest {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  zone?: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon_name?: string;
}

export interface Venue {
  id: number;
  name: string;
  address?: string;
  city: string;
  zone?: string;
  latitude?: number;
  longitude?: number;
  max_capacity: number;
}

export type Modality = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
export type ExperienceStatus = 'DRAFT' | 'OPEN' | 'CONFIRMED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface Experience {
  id: number;
  host_id: number;
  host_name?: string;
  category_id: number;
  category_name?: string;
  venue_id?: number;
  venue_name?: string;
  zone?: string;
  address?: string;
  title: string;
  description: string;
  cover_image_url?: string;
  modality: Modality;
  status: ExperienceStatus;
  price: number;
  min_capacity: number;
  max_capacity: number;
  reserved_slots: number;
  event_date: string;
  duration_minutes: number;
  virtual_meeting_url?: string;
  is_quorum_reached: boolean;
  created_at: string;
}

export interface CreateExperiencePayload {
  category_id: number;
  venue_id?: number;
  venue_name?: string;
  zone?: string;
  address?: string;
  title: string;
  description: string;
  cover_image_url?: string;
  modality: Modality;
  price: number;
  min_capacity: number;
  max_capacity: number;
  event_date: string;
  duration_minutes: number;
  virtual_meeting_url?: string;
}

export interface CatalogFilters {
  category_id?: number;
  modality?: Modality | '';
  search?: string;
  zone?: string;
  only_open?: boolean;
  max_price?: number;
}

export interface CatalogResponse {
  total: number;
  experiences: Experience[];
}

export interface Booking {
  id: number;
  user_id: number;
  experience_id: number;
  experience_title?: string;
  event_date?: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  qr_payload: string;
  is_used: boolean;
}

export interface SaaSPlan {
  id: number;
  name: string;
  monthly_price: number;
  features_included: Record<string, unknown>;
  is_active: boolean;
}

export interface MatchingGroup {
  id: number;
  experience_id: number;
  target_quorum: number;
  current_members: number;
  status: string;
  deadline: string;
  is_quorum_reached: boolean;
}

export interface UnmetDemandInsight {
  id: number;
  zone: string;
  category_keyword: string;
  search_count: number;
  suggested_price?: number;
  suggested_time_slot?: string;
}

export interface LiveMetrics {
  session_id: number;
  recorded_at: string;
  detected_faces_count: number;
  attention_score: number;
  joy_score: number;
  neutral_score: number;
  inattention_score: number;
  dominant_age_group?: string;
  energy_traffic_light: 'GREEN' | 'YELLOW' | 'RED';
}

export interface ActionSuggestion {
  id: number;
  session_id: number;
  suggestion_type: 'MC_DYNAMIC' | 'DJ_MUSIC_CHANGE' | 'BREAK';
  suggestion_text: string;
  recommended_bpm?: string;
  recommended_genre?: string;
  applied: boolean;
  created_at: string;
}

export interface PostEventReport {
  session_id: number;
  experience_id: number;
  experience_title: string;
  total_duration_minutes: number;
  average_attention_score: number;
  average_joy_score: number;
  peak_engagement_minute: number;
  timeline: {
    minute: number;
    average_attention: number;
    average_joy: number;
  }[];
}
