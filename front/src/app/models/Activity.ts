import { Process } from './Process';
import { Role } from './Role';

/**
 * Activity DTO - Compatible con backend Spring Boot
 * 
 * Campos de ESCRITURA (crear/actualizar):
 * - processId, roleId (enviar IDs)
 * 
 * Campos de LECTURA (respuesta backend):
 * - process, role (objetos completos anidados)
 */
export interface Activity {
  id?: number;
  name: string;
  description: string;

  // Posición y tamaño en el board (CRÍTICO para canvas)
  x: number;
  y: number;
  width: number;
  height: number;

  // Relaciones: enviar IDs al backend
  processId?: number;
  roleId?: number;

  // Objetos anidados (solo en respuestas del backend)
  process?: Process;
  role?: Role;

  status: string; // 'active' | 'inactive'
}
