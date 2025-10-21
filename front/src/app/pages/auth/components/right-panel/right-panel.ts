import { Component, EventEmitter, Output } from '@angular/core';
import { Register } from './register/register';
import { Registration } from '../../../../models/Registration';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [Register],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css'
})
export class RightPanel {
  @Output() register = new EventEmitter<Registration>();

  onRegister(data: Registration) {
    this.register.emit(data); 
  }
}
