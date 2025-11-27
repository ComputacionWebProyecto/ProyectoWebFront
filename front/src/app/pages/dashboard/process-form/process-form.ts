import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Process } from '../../../models/Process';

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-form.html',
  styleUrl: './process-form.css'
})
export class ProcessForm implements OnChanges {
  @Output() onSave = new EventEmitter<Process>();
  @Output() onCancel = new EventEmitter<void>();
  @Input() processData: Process | null = null;

  process: Process = new Process('', '');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processData'] && this.processData) {
      this.process = {
        id: this.processData.id,
        name: this.processData.name,
        description: this.processData.description,
        companyId: (this.processData as any).companyId || (this.processData as any).company?.id
      };
    } else if (changes['processData'] && !this.processData) {
      // Resetear el formulario cuando processData es null
      this.process = new Process('', '');
    }
  }

  save() {
    this.onSave.emit(this.process);
  }

  cancel() {
    this.onCancel.emit();
  }
}
