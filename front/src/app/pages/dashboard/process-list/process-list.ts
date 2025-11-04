import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process } from '../../../models/Process';
import { ActiveProcessService, ProcessModel } from '../../../services/active-process.service';

/**
 * PROCESS LIST COMPONENT
 *
 * Componente que muestra la lista de procesos de la empresa en el panel lateral.
 * Permite seleccionar un proceso como activo y eliminarlo.
 *
 * INTEGRACIÓN CON ActiveProcessService:
 * Al hacer click en un proceso, convierte el objeto Process a ProcessModel
 * y lo establece como proceso activo, permitiendo al usuario ver el nombre
 * del proceso en el que está trabajando.
 *
 * INDICADOR VISUAL:
 * Muestra qué proceso está actualmente activo comparando el ID del proceso
 * con el ID del proceso activo en el servicio.
 */
@Component({
  selector: 'app-process-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-list.html',
  styleUrl: './process-list.css'
})
export class ProcessList {
  @Input() processes: Process[] = [];
  @Output() onDelete = new EventEmitter<number>();

  constructor(private activeProcessService: ActiveProcessService) { }

  /**
   * Selecciona un proceso como activo.
   *
   * CONVERSIÓN A ProcessModel:
   * El array processes puede tener diferentes formatos (Process, BackendProcessResponse),
   * por lo que se mapea explícitamente a ProcessModel con los campos requeridos.
   *
   * VALIDACIÓN:
   * - Verifica que el proceso tenga id y name (campos obligatorios)
   * - Si faltan campos, muestra advertencia pero no establece el proceso
   *
   * COMPORTAMIENTO:
   * Al establecer el proceso activo:
   * - El dashboard filtra elementos por processId
   * - Los formularios (edge, activity, gateway) auto-rellenan el campo processId
   * - El header muestra el nombre del proceso activo
   */
  selectProcess(process: any): void {
    if (!process) {
      console.warn('[ProcessList] Proceso inválido:', process);
      return;
    }

    // Validar campos requeridos
    if (!process.id || !process.name) {
      console.warn('[ProcessList] Proceso sin ID o nombre:', process);
      return;
    }

    // Mapear a ProcessModel con todos los campos disponibles
    const processModel: ProcessModel = {
      id: process.id,
      name: process.name,
      description: process.description,
      companyId: process.companyId
    };

    this.activeProcessService.setActiveProcess(processModel);
    console.log(`[ProcessList] Proceso seleccionado: "${processModel.name}" (ID: ${processModel.id})`);
  }

  /**
   * Obtiene el ID del proceso activo para resaltar visualmente.
   *
   * RETORNO:
   * - number: ID del proceso activo
   * - null: No hay proceso activo
   *
   * USO EN TEMPLATE:
   * [class.active]="getActiveProcessId() === process.id"
   */
  getActiveProcessId(): number | null {
    return this.activeProcessService.getActiveProcessId();
  }
}
