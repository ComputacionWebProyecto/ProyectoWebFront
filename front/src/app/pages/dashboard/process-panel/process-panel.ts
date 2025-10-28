import { ChangeDetectorRef, Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para NgIf y NgFor
import { ProcessService } from '../../../services/process.service';
import { Process } from '../../../models/Process';
import { ProcessList } from '../process-list/process-list';
import { ProcessForm } from '../process-form/process-form';
import { AuthService } from '../../../services/auth.service';
import { BackendProcessResponse } from '../../../models/BackendProcessResponse';


@Component({
  selector: 'app-process-panel',
  standalone: true,
  imports: [CommonModule,ProcessList, ProcessForm],
  templateUrl: './process-panel.html',
  styleUrl: './process-panel.css'
})
export class ProcessPanel implements OnInit {
  @Input() isOpen = false; 
  processes: BackendProcessResponse[] = [];
  isCreating = false; // Formulario o lista

 constructor(private processService: ProcessService, private authService: AuthService, private cdr: ChangeDetectorRef) {}

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

  saveProcess(newProcess: Process) {
    const user = this.authService.getUser();
    console.log('Datos usuario:', user);
    newProcess.companyId = user?.company.id;
    console.log('Proceso a crear:', newProcess);
    this.processService.createProcess(newProcess).subscribe({
      next: () => {
        this.isCreating = false;
        this.loadProcesses(); // recargar la lista
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
