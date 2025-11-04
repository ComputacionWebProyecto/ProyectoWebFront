import { ChangeDetectorRef, Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessService } from '../../../services/process.service';
import { Process } from '../../../models/Process';
import { ProcessList } from '../process-list/process-list';
import { ProcessForm } from '../process-form/process-form';
import { AuthService } from '../../../services/auth.service';
import { ActiveProcessService, ProcessModel } from '../../../services/active-process.service';
import { BackendProcessResponse } from '../../../models/BackendProcessResponse';


@Component({
  selector: 'app-process-panel',
  standalone: true,
  imports: [CommonModule, ProcessList, ProcessForm],
  templateUrl: './process-panel.html',
  styleUrl: './process-panel.css'
})
export class ProcessPanel implements OnInit {
  @Input() isOpen = false;
  processes: BackendProcessResponse[] = [];
  isCreating = false;

  constructor(
    private processService: ProcessService,
    private authService: AuthService,
    private activeProcessService: ActiveProcessService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProcesses();
  }

   loadProcesses() {
    const user = this.authService.getUser();
      console.log("datos usuario: ", user);
      const companyId = user?.company?.id;
      if (typeof companyId === 'number') {
        this.processService.getProcessesSummaryByCompanyId(companyId).subscribe({
          next: (data: BackendProcessResponse[]) => {
            this.processes = [...data];
            console.log("Procesos recibidos del backend:", data);
            this.cdr.detectChanges();
          },
          error: (err) => console.log("Error loading users: ", err)
        });
      }
    }

  openCreateForm() {
    this.isCreating = true;
  }

  closePanel() {
    this.isOpen = false;
  }

  cancelCreate() {
    this.isCreating = false;
  }

  /**
   * Guarda un nuevo proceso en el backend y lo selecciona automáticamente.
   *
   * FLUJO:
   * 1. Obtiene el companyId del usuario autenticado
   * 2. Crea el proceso en el backend via ProcessService
   * 3. Convierte la respuesta del backend a ProcessModel
   * 4. Establece el proceso recién creado como activo
   * 5. Recarga la lista de procesos
   *
   * CONVERSIÓN A ProcessModel:
   * La respuesta del backend puede tener formato diferente (BackendProcessResponse)
   * por lo que se mapea explícitamente a ProcessModel para el servicio.
   */
  saveProcess(newProcess: Process) {
    const user = this.authService.getUser();
    console.log('Datos usuario:', user);

    // Obtener companyId del usuario (soporta ambos formatos)
    const companyId = (user as any)?.companyId ?? (user as any)?.company?.id;

    if (!companyId) {
      console.error('❌ No se pudo obtener companyId del usuario:', user);
      alert('Error: No se pudo determinar la empresa del usuario.');
      return;
    }

    newProcess.companyId = companyId;
    console.log('Proceso a crear:', newProcess);

    this.processService.createProcess(newProcess).subscribe({
      next: (created) => {
        this.isCreating = false;
        this.loadProcesses();

        // Seleccionar automáticamente el proceso recién creado como activo
        if (created?.id && created?.name) {
          const processModel: ProcessModel = {
            id: created.id,
            name: created.name,
            description: created.description,
            companyId: created.companyId
          };
          this.activeProcessService.setActiveProcess(processModel);
          console.log('✅ Proceso creado y seleccionado automáticamente:', processModel);
        }
      },
      error: (err) => console.error('Error creating process', err)
    });
  }

  deleteProcess(processId: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este proceso?')) return;

    this.processService.deleteProcess(processId).subscribe({
      next: () => {
        console.log('Usuario eliminado con éxito');
        // actualiza la lista sin recargar
        this.loadProcesses();
        console.log('Lista actualizada con éxito');
      },
      error: (err) => console.log('Error eliminando proceso: ', err)
    });
  }
}
