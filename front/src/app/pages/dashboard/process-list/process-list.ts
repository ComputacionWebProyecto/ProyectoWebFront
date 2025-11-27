import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendProcessResponse } from '../../../models/BackendProcessResponse';
import { ActiveProcessService } from '../../../services/active-process.service';

@Component({
  selector: 'app-process-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-list.html',
  styleUrl: './process-list.css'
})
//comentario
export class ProcessList {
  @Input() processes: BackendProcessResponse[] = [];
  @Output() onDelete = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<BackendProcessResponse>();

  constructor(private activeProcessService: ActiveProcessService) { }

  selectProcess(processId: number | undefined): void {
    if (processId) {
      const process = this.processes.find(p => p.id === processId);
      this.activeProcessService.setActiveProcess(processId, process?.name);
      console.log('Proceso seleccionado:', processId, process?.name);
    }
  }
}
