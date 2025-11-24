import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Decision } from './decision';

describe('Decision', () => {
  let component: Decision;
  let fixture: ComponentFixture<Decision>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Decision]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Decision);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
