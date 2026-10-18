/**
 * @fileoverview Modelos de dominio para grupos de matching y prospección de demanda urbana (CU-07, CU-08).
 * Responsabilidad: Definir la viabilidad de quórum por agrupación inteligente y análisis de mercado local.
 */

/**
 * Grupo de matching dinámico para consolidar cupos mínimos viables.
 */
export interface MatchingGroup {
  /** Identificador único del grupo de matching */
  id: number;
  /** Identificador de la experiencia postulada */
  experience_id: number;
  /** Quórum objetivo a alcanzar */
  target_quorum: number;
  /** Miembros actualmente agrupados */
  current_members: number;
  /** Estado del grupo (FORMING, CONFIRMED, EXPIRED) */
  status: string;
  /** Fecha límite para consolidar el grupo */
  deadline: string;
  /** Indica si se alcanzó el quórum necesario para confirmar el evento */
  is_quorum_reached: boolean;
}

/**
 * Indicador de demanda insatisfecha por zona geográfica (CU-08).
 */
export interface UnmetDemandInsight {
  /** Identificador de la métrica */
  id: number;
  /** Zona o barrio geográfico */
  zone: string;
  /** Palabra clave o categoría demandada */
  category_keyword: string;
  /** Cantidad de búsquedas registradas sin oferta cubierta */
  search_count: number;
  /** Precio sugerido para que la oferta sea competitiva */
  suggested_price?: number;
  /** Franja horaria sugerida */
  suggested_time_slot?: string;
}
