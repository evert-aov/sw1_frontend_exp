/**
 * @fileoverview Modelo de categorías temáticas de experiencias.
 * Responsabilidad: Definir la clasificación temática del catálogo.
 */

/**
 * Representa una categoría temática disponible para catalogar eventos.
 */
export interface Category {
  /** Identificador único de la categoría (UUID) */
  id: string;
  /** Nombre descriptivo (ej. Gastronomía, Arte & Pintura) */
  name: string;
  /** Breve descripción del alcance temático */
  description?: string;
  /** Identificador de icono semántico asociado */
  icon_name?: string;
}
