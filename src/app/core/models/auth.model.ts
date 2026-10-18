/**
 * @fileoverview Contratos de autenticación y sesiones JWT con el backend FastAPI.
 * Responsabilidad: Definir estructuras de solicitud y respuesta de autenticación.
 */

import { UserRole } from './user.model';

/**
 * Respuesta devuelta por el endpoint de autenticación con token Bearer JWT.
 */
export interface AuthResponse {
  /** Token de acceso JWT */
  access_token: string;
  /** Tipo de token de autenticación (ej. Bearer) */
  token_type: string;
  /** Identificador único del usuario autenticado */
  user_id: number;
  /** Correo electrónico autenticado */
  email: string;
  /** Roles de acceso asociados */
  roles: string[];
}

/**
 * Solicitud de registro de nueva cuenta de usuario (CU-01 / HU-01).
 */
export interface RegisterRequest {
  /** Nombre del usuario */
  first_name: string;
  /** Apellido del usuario */
  last_name?: string;
  /** Correo electrónico único */
  email: string;
  /** Contraseña en texto plano a ser hasheada en backend */
  password: string;
  /** Teléfono opcional */
  phone?: string;
  /** Rol inicial elegido durante el registro */
  role: UserRole;
}
