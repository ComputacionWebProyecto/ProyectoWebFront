import { Component } from '@angular/core';
import { LeftPanel } from './components/left-panel/left-panel';
import { RightPanel } from './components/right-panel/right-panel';

@Component({
  selector: 'app-auth',
  imports: [LeftPanel, RightPanel],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {

}
