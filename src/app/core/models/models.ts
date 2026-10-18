/**
 * @fileoverview Re-exportación de contratos para compatibilidad retroactiva.
 * Los modelos han sido desacoplados en submódulos especializados por dominio:
 * - user.model.ts (Usuarios y perfiles)
 * - auth.model.ts (Autenticación y tokens JWT)
 * - category.model.ts (Categorías de catálogo)
 * - venue.model.ts (Establecimientos y sedes)
 * - experience.model.ts (Experiencias, creación y filtros)
 * - booking.model.ts (Reservas, entradas y planes SaaS)
 * - matching.model.ts (Grupos de matching y prospección)
 * - live.model.ts (Métricas en vivo y asistentes MC/DJ)
 */

export * from './index';
