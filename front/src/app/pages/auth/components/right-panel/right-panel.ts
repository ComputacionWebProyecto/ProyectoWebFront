import { Component } from '@angular/core';
import { Register } from './register/register';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [Register],
  templateUrl: './right-panel.html',
  styleUrl: './right-panel.css'
})
export class RightPanel {

}
