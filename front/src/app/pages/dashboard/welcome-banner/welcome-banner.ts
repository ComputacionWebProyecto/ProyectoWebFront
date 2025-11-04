import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] max-w-2xl w-full px-4">
      <!-- Banner sin proceso -->
      <div
        *ngIf="!hasProcess"
        class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-xl p-6 mb-4 animate-fade-in">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-blue-900 mb-2">
              ¡Bienvenido! Comienza creando tu primer proceso
            </h3>
            <p class="text-blue-800 mb-4">
              Para poder agregar elementos al tablero (Gateways, Activities), primero necesitas crear un proceso.
              Un proceso es como una hoja nueva donde podrás diseñar tus diagramas.
            </p>
            <button
              (click)="onCreateProcess()"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md">
              📋 Crear Mi Primer Proceso
            </button>
          </div>
          <button
            (click)="onDismissProcessBanner()"
            class="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Banner sin roles -->
      <div
        *ngIf="hasProcess && !hasRole && !processAlertDismissed"
        class="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg shadow-xl p-6 animate-fade-in">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <svg class="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-amber-900 mb-2">
              Considera crear roles para tu equipo
            </h3>
            <p class="text-amber-800 mb-4">
              Los roles te permiten asignar responsabilidades a diferentes miembros de tu equipo en las actividades del proceso.
              Aunque no es obligatorio, te ayudará a organizar mejor tu trabajo.
            </p>
            <button
              (click)="onCreateRole()"
              class="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md">
              👥 Crear Roles
            </button>
          </div>
          <button
            (click)="onDismissRoleBanner()"
            class="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.5s ease-out;
    }
  `]
})
export class WelcomeBanner {
  @Input() hasProcess: boolean = false;
  @Input() hasRole: boolean = false;
  @Input() processAlertDismissed: boolean = false;

  @Output() createProcess = new EventEmitter<void>();
  @Output() createRole = new EventEmitter<void>();
  @Output() dismissProcessBanner = new EventEmitter<void>();
  @Output() dismissRoleBanner = new EventEmitter<void>();

  onCreateProcess() {
    this.createProcess.emit();
  }

  onCreateRole() {
    this.createRole.emit();
  }

  onDismissProcessBanner() {
    this.dismissProcessBanner.emit();
  }

  onDismissRoleBanner() {
    this.dismissRoleBanner.emit();
  }
}

