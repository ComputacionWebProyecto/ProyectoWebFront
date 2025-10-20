import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessPanel } from './process-panel';

describe('ProcessPanel', () => {
  let component: ProcessPanel;
  let fixture: ComponentFixture<ProcessPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
