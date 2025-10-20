import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessForm } from './process-form';

describe('ProcessForm', () => {
  let component: ProcessForm;
  let fixture: ComponentFixture<ProcessForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
