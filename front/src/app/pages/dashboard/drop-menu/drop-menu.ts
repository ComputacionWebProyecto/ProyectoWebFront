// drop-menu.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GatewayComponent } from "../gateway/gateway";
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
  @Input() isOpen = true;
  @Output() componentSelected = new EventEmitter<{type: string, category: string}>();

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

  // Método para cuando se inicia el arrastre de un componente
  onDragStart(event: DragEvent, componentType: string, category: string) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('component-type', componentType);
      event.dataTransfer.setData('component-category', category);
      
      // Agregar clase visual durante el arrastre
      const target = event.target as HTMLElement;
      target.classList.add('opacity-50');
    }
  }

  // Método para cuando termina el arrastre
  onDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.classList.remove('opacity-50');
  }

  // Método para cuando se hace clic en un componente (alternativa al drag)
  onSelectComponent(componentType: string, category: string) {
    console.log('Componente seleccionado:', componentType, 'Categoría:', category);
    this.componentSelected.emit({ type: componentType, category: category });
  }
}

