// drop-menu.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-drop-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-menu.html',
  styleUrls: ['./drop-menu.css']
})
export class DropdownMenuComponent {
  @Input() isOpen = true; // Recibe el estado desde el padre

  constructor(private authService: AuthService, private router: Router){}

  logout(){
    this.authService.logout();
    this.router.navigate(['auth']);
    
  }
}