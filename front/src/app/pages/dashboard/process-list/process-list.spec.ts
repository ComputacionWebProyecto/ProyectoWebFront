import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessList } from './process-list';

describe('ProcessList', () => {
  let component: ProcessList;
  let fixture: ComponentFixture<ProcessList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
