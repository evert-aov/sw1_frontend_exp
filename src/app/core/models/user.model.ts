/**
 * @fileoverview Modelos de dominio para usuarios y perfiles en EXPERIENCIA.
 * Cumple con el principio de Responsabilidad Única (SRP) y alta cohesión.
 */

/**
 * Roles permitidos en la plataforma para control de acceso y vistas.
 */
export type UserRole = 'ATTENDEE' | 'HOST' | 'VENUE' | 'ADMIN';

/**
 * Representa la entidad de un usuario registrado en la plataforma.
 */
export interface User {
  /** Identificador único del usuario */
  id: number;
  /** Nombres del usuario */
  first_name: string;
  /** Apellidos del usuario */
  last_name?: string;
  /** Correo electrónico institucional o personal */
  email: string;
  /** Número de teléfono o contacto de WhatsApp */
  phone?: string;
  /** Ciudad de residencia (ej. Santa Cruz de la Sierra) */
  city?: string;
  /** Barrio o zona geográfica urbana (ej. Equipetrol) */
  zone?: string;
  /** URL de la fotografía de perfil */
  avatar_url?: string;
  /** Biografía o presentación personal */
  bio?: string;
  /** Lista de etiquetas de intereses temáticos */
  interests: string[];
  /** Roles asignados para permisos */
  roles: string[];
  /** Fecha de registro en formato ISO */
  created_at: string;
}

/**
 * Carga útil para la actualización del perfil de usuario (CU-02 / HU-03).
 */
export interface ProfileUpdateRequest {
  /** Nombres a actualizar */
  first_name?: string;
  /** Apellidos a actualizar */
  last_name?: string;
  /** Número telefónico */
  phone?: string;
  /** Ciudad */
  city?: string;
  /** Barrio o zona */
  zone?: string;
  /** URL de avatar */
  avatar_url?: string;
  /** Biografía personal */
  bio?: string;
  /** Lista de intereses actualizados */
  interests?: string[];
}
