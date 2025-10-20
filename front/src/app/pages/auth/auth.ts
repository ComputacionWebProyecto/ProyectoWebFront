import { Component } from '@angular/core';
import { LeftPanel } from './components/left-panel/left-panel';
import { RightPanel } from './components/right-panel/right-panel';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [LeftPanel, RightPanel],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

}
