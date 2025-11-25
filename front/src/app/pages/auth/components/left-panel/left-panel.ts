import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActiveProcessService } from '../../../../services/active-process.service';

@Component({
  selector: 'app-left-panel',
  imports: [],
  templateUrl: './left-panel.html',
  styleUrl: './left-panel.css'
})
export class LeftPanel implements OnDestroy {
  // Nombre del proceso activo (mostrado junto a "404 Not Found")
  activeProcessName: string | null = null;

  private sub?: Subscription;

  constructor(private activeProcessService: ActiveProcessService) {
    // Suscribimos para mantener el nombre actualizado en tiempo real
    this.sub = this.activeProcessService.activeProcessName$.subscribe((name) => {
      this.activeProcessName = name;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

}
