import { Process } from './Process';
import { Activity } from './Activity';

/**
 * Tipo de extremo (nodo) soportado por un Edge
 */
export type EndpointKind = 'activity' | 'gateway';

/**
 * Edge DTO - Compatible con backend Spring Boot
 * 
 * IMPORTANTE: El backend debe soportar extremos tipados para conectar
 * Activity↔Activity, Activity↔Gateway, Gateway↔Activity, Gateway↔Gateway
 * 
 * Campos de ESCRITURA (crear/actualizar):
 * - fromType, fromId, toType, toId (NUEVO sistema tipado)
 * - activitySourceId, activityDestinyId (LEGACY para compatibilidad A→A)
 * - processId
 * 
 * Campos de LECTURA (respuesta backend):
 * - process, activitySource, activityDestiny (objetos completos)
 */
export interface Edge {
  id?: number;
  
  // Etiqueta del flujo
  label?: string;
  description?: string;

  // NUEVO: extremos tipados (soporta Activity↔Gateway)
  fromType?: EndpointKind;
  fromId?: number;
  toType?: EndpointKind;
  toId?: number;

  // Relación con proceso
  processId?: number;

  // LEGADO: compat para Activity↔Activity (no eliminar hasta que backend migre)
  activitySourceId?: number;
  activityDestinyId?: number;

  // Objetos anidados (solo en respuestas del backend)
  process?: Process;
  activitySource?: Activity;
  activityDestiny?: Activity;

  status: string; // 'active' | 'inactive'
}
