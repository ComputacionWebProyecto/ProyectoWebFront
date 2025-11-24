import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Parallel } from './parallel';

describe('Parallel', () => {
  let component: Parallel;
  let fixture: ComponentFixture<Parallel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parallel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Parallel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
