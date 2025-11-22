import { Process } from './Process';

/**
 * Gateway DTO - Compatible con backend Spring Boot
 * 
 * Tipos soportados:
 * - 'decision-gateway' (diamante con ?)
 * - 'parallel-gateway' (diamante con +)
 * - 'exclusive-gateway' (diamante con X)
 * 
 * Campos de ESCRITURA (crear/actualizar):
 * - processId (enviar ID)
 * 
 * Campos de LECTURA (respuesta backend):
 * - process (objeto completo anidado)
 */
export interface Gateway {
  id?: number;
  type: string; // 'decision-gateway', 'parallel-gateway', 'exclusive-gateway'
  status: string; // 'active' | 'inactive'
  
  // Posición en el board (CRÍTICO para canvas)
  x: number;
  y: number;

  // Relación con proceso
  processId?: number;

  // Objeto anidado (solo en respuestas del backend)
  process?: Process;
}