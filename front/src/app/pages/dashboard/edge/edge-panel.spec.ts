// src/app/pages/dashboard/edge/edge-panel.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EdgePanel } from './edge-panel';
import { Edge } from '../../../models/Edge';
import { EdgeService } from '../../../services/edge.service';

class MockEdgeService {
  list$ = of([] as Edge[]);
  create = jasmine.createSpy('create').and.returnValue(of({} as Edge));
  update = jasmine.createSpy('update').and.returnValue(of({} as Edge));
  delete = jasmine.createSpy('delete').and.returnValue(of(void 0));
}

describe('EdgePanel', () => {
  let component: EdgePanel;
  let fixture: ComponentFixture<EdgePanel>;
  let service: MockEdgeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgePanel],
      providers: [{ provide: EdgeService, useClass: MockEdgeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(EdgePanel);
    component = fixture.componentInstance;
    service = TestBed.inject(EdgeService) as unknown as MockEdgeService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initial form should be invalid', () => {
    expect(component['form'].invalid).toBeTrue();
  });

  it('should call service.create on submit when not editing', () => {
    // Aseguramos que no esté en modo edición
    component['editingId'].set(null);

    component['form'].setValue({
      processId: 1,
      activitySourceId: 2,
      activityDestinyId: 3,
      label: 'flujo demo',
    });

    component.submit();
    expect(service.create).toHaveBeenCalledTimes(1);

    const args = service.create.calls.mostRecent().args[0] as Omit<Edge, 'id'>;
    expect(args.processId).toBe(1);
    expect(args.activitySourceId).toBe(2);
    expect(args.activityDestinyId).toBe(3);
    expect(args.label).toBe('flujo demo');
  });

  it('should call service.update on submit when editing', () => {
    const existing: Edge = {
      id: 7,
      processId: 10,
      activitySourceId: 1,
      activityDestinyId: 2,
      label: 'original',
    };

    component.edit(existing);
    fixture.detectChanges();

    // Cambiamos el label y mantenemos ids válidos
    component['form'].setValue({
      processId: 10,
      activitySourceId: 1,
      activityDestinyId: 3,
      label: 'actualizado',
    });

    component.submit();
    expect(service.update).toHaveBeenCalledTimes(1);

    const updated = service.update.calls.mostRecent().args[0] as Edge;
    expect(updated.id).toBe(7);
    expect(updated.processId).toBe(10);
    expect(updated.activitySourceId).toBe(1);
    expect(updated.activityDestinyId).toBe(3);
    expect(updated.label).toBe('actualizado');
  });

  it('should call service.delete on remove', () => {
    component.remove(5);
    expect(service.delete).toHaveBeenCalledOnceWith(5);
  });
});
