import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process } from '../../../models/Process';
import { ActiveProcessService } from '../../../services/active-process.service';

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

  selectProcess(processId: number | undefined): void {
    if (processId) {
      this.activeProcessService.setActiveProcess(processId);
      console.log('Proceso seleccionado:', processId);
    }
  }
}
