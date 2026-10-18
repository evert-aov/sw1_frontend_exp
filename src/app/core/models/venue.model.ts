/**
 * @fileoverview Modelo de establecimientos y locales anfitriones.
 * Responsabilidad: Definir datos de infraestructura y geolocalización de sedes físicas.
 */

/**
 * Representa un establecimiento o sede física donde se desarrollan experiencias presenciales o híbridas.
 */
export interface Venue {
  /** Identificador único del establecimiento */
  id: number;
  /** Nombre comercial o del local */
  name: string;
  /** Dirección física legible */
  address?: string;
  /** Ciudad donde se encuentra la sede */
  city: string;
  /** Barrio o zona urbana */
  zone?: string;
  /** Latitud geográfica para georreferenciación */
  latitude?: number;
  /** Longitud geográfica para georreferenciación */
  longitude?: number;
  /** Capacidad máxima estructural permitida */
  max_capacity: number;
}
