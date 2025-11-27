import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Exclusive } from './exclusive';

describe('Exclusive', () => {
  let component: Exclusive;
  let fixture: ComponentFixture<Exclusive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exclusive]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Exclusive);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
