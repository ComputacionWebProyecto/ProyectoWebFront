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

  // Estado de los submenús
  isGatewayOpen = false;
  isTasksOpen = false;
  isEventsOpen = false;

  // Toggle para cada submenú
  toggleGateway() {
    this.isGatewayOpen = !this.isGatewayOpen;
  }

  toggleTasks() {
    this.isTasksOpen = !this.isTasksOpen;
  }

  toggleEvents() {
    this.isEventsOpen = !this.isEventsOpen;
  }

  // Método para cuando se selecciona un componente
  onSelectComponent(componentType: string) {
    console.log('Componente seleccionado:', componentType);
    // Aquí puedes emitir un evento al componente padre o manejar la lógica
  }
}