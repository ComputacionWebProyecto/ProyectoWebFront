// src/app/services/active-process.service.ts
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Modelo simplificado del proceso que se mantiene en el servicio.
 * Contiene los campos esenciales para identificar y mostrar el proceso activo.
 */
export interface ProcessModel {
  id: number;
  name: string;
  description?: string;
  companyId?: number;
}

/**
 * ACTIVE PROCESS SERVICE
 *
 * Servicio que gestiona el proceso actualmente activo en el dashboard.
 * Mantiene tanto el ID del proceso como el objeto completo, permitiendo
 * al usuario saber en qué proceso está trabajando por nombre, no solo por ID.
 *
 * PROPÓSITO:
 * Resolver el problema de que los usuarios no pueden saber visualmente en qué
 * proceso están trabajando cuando solo se muestra el ID numérico de la BD.
 *
 * PERSISTENCIA:
 * El proceso activo se guarda en localStorage para mantener la selección
 * del usuario entre sesiones.
 *
 * FORMATO DUAL:
 * Mantiene dos streams para compatibilidad con código existente:
 * - activeProcessId$: emite solo el ID (number | null)
 * - currentProcess$: emite el objeto completo (ProcessModel | null)
 *
 * SINCRONIZACIÓN:
 * Cuando se establece un proceso, ambos streams se actualizan automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class ActiveProcessService {
  private static readonly STORAGE_KEY = 'activeProcess';

  private activeProcessIdSubject = new BehaviorSubject<number | null>(null);
  /** Stream del ID del proceso activo (compatibilidad con código existente) */
  public readonly activeProcessId$: Observable<number | null> = this.activeProcessIdSubject.asObservable();

  private activeProcessSubject = new BehaviorSubject<ProcessModel | null>(null);
  /** Stream del proceso activo completo (incluye id, name, description) */
  public readonly currentProcess$: Observable<ProcessModel | null> = this.activeProcessSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Carga perezosa al construir (SSR-safe)
    if (isPlatformBrowser(this.platformId)) {
      this.restoreActiveProcess();
    }
  }

  /**
   * Obtiene el ID del proceso activo actual (snapshot síncrono).
   *
   * RETORNO:
   * - number: ID del proceso activo
   * - null: No hay proceso activo
   */
  getActiveProcessId(): number | null {
    return this.activeProcessIdSubject.value;
  }

  /**
   * Obtiene el proceso activo completo (snapshot síncrono).
   *
   * RETORNO:
   * - ProcessModel: Objeto con id, name, description
   * - null: No hay proceso activo
   */
  getActiveProcess(): ProcessModel | null {
    return this.activeProcessSubject.value;
  }

  /** Verifica si hay un proceso activo seleccionado */
  hasActiveProcess(): boolean {
    return this.getActiveProcessId() != null;
  }

  /**
   * Establece el proceso activo a partir de un objeto proceso completo.
   *
   * COMPORTAMIENTO:
   * - Actualiza ambos streams (ID y objeto completo)
   * - Persiste en localStorage el objeto completo
   * - Muestra log informativo en consola
   *
   * PARÁMETRO:
   * - process: Objeto con al menos {id, name}, opcionalmente {description, companyId}
   *
   * USO TÍPICO:
   * Cuando el usuario selecciona un proceso desde la lista "My Processes"
   */
  setActiveProcess(process: ProcessModel): void {
    this.activeProcessSubject.next(process);
    this.activeProcessIdSubject.next(process.id);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ActiveProcessService.STORAGE_KEY, JSON.stringify(process));
    }

    console.log(`✅ Proceso activo establecido: "${process.name}" (ID: ${process.id})`);
  }

  /**
   * Establece el proceso activo solo con su ID (compatibilidad con código legacy).
   *
   * COMPORTAMIENTO:
   * - Actualiza stream de ID
   * - Limpia stream de objeto completo
   * - Persiste solo el ID en localStorage
   *
   * LIMITACIÓN:
   * No permite mostrar el nombre del proceso en la UI, solo el ID.
   * Preferir usar setActiveProcess(ProcessModel) cuando sea posible.
   */
  setActiveProcessId(processId: number): void {
    this.activeProcessIdSubject.next(processId);
    this.activeProcessSubject.next(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ActiveProcessService.STORAGE_KEY, JSON.stringify(processId));
    }

    console.log(`✅ Proceso activo establecido por ID: ${processId}`);
  }

  /**
   * Limpia el proceso activo.
   *
   * COMPORTAMIENTO:
   * - Establece ambos streams en null
   * - Elimina la entrada de localStorage
   * - Útil al hacer logout o al querer resetear la selección
   */
  clearActiveProcess(): void {
    this.activeProcessSubject.next(null);
    this.activeProcessIdSubject.next(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(ActiveProcessService.STORAGE_KEY);
    }

    console.log('🔄 Proceso activo limpiado');
  }

  /**
   * Restaura el proceso activo desde localStorage.
   *
   * FORMATOS SOPORTADOS:
   * - Objeto completo: {id, name, description, ...}
   * - Solo ID (number): compatibilidad con versión anterior
   *
   * COMPORTAMIENTO:
   * - Si encuentra objeto: establece ambos streams
   * - Si encuentra ID: establece solo stream de ID
   * - Si no encuentra nada o es inválido: deja ambos streams en null
   *
   * LLAMADO:
   * - Automáticamente en el constructor (si es browser)
   * - Manualmente cuando se necesite recargar desde localStorage
   */
  restoreActiveProcess(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const saved = localStorage.getItem(ActiveProcessService.STORAGE_KEY);
      if (!saved) {
        console.log('proceso activo (restore): null');
        return;
      }

      const parsed = JSON.parse(saved);

      // Caso 1: Objeto completo con {id, name, ...}
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
        this.activeProcessSubject.next(parsed as ProcessModel);
        this.activeProcessIdSubject.next(parsed.id);
        console.log(`proceso activo (restore): "${parsed.name}" (ID: ${parsed.id})`);
      }
      // Caso 2: Solo ID numérico (compatibilidad legacy)
      else if (typeof parsed === 'number' && !isNaN(parsed)) {
        this.activeProcessIdSubject.next(parsed);
        this.activeProcessSubject.next(null);
        console.log(`proceso activo (restore): ID ${parsed}`);
      }
      // Caso 3: Formato inválido
      else {
        console.warn('proceso activo (restore): formato inválido', parsed);
        this.clearActiveProcess();
      }
    } catch (e) {
      console.error('[ActiveProcessService] Error al restaurar proceso activo:', e);
      this.clearActiveProcess();
    }
  }
}
