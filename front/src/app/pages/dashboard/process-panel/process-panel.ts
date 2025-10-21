import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para NgIf y NgFor
import { ProcessService } from '../../../services/process.service';
import { Process } from '../../../models/Process';
import { ProcessList } from '../process-list/process-list';
import { ProcessForm } from '../process-form/process-form';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-process-panel',
  standalone: true,
  imports: [CommonModule,ProcessList, ProcessForm],
  templateUrl: './process-panel.html',
  styleUrl: './process-panel.css'
})
export class ProcessPanel implements OnInit {
  @Input() isOpen = false; 
  processes: Process[] = [];
  isCreating = false; // Formulario o lista

 constructor(private processService: ProcessService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadProcesses();
  }

  loadProcesses() {
    this.processService.getProcesses().subscribe({
      next: (data: Process[]) => this.processes = data,
      error: (err: any) => console.error('Error loading processes', err)
    });
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
    this.processService.deleteProcess(processId).subscribe({
      next: () => this.loadProcesses(),
      error: (err) => console.error('Error deleting process', err)
    });
  }
}
