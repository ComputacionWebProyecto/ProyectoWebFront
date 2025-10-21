import { Component, EventEmitter, Output } from '@angular/core';
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
export class ProcessForm {
  @Output() onSave = new EventEmitter<Process>();
  @Output() onCancel = new EventEmitter<void>();

  process: Process = new Process('', '');

  save() {
    this.onSave.emit(this.process);
  }

  cancel() {
    this.onCancel.emit();
  }
}
