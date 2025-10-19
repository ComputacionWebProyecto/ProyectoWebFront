import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderDashboard } from './header-dashboard';

describe('HeaderDashboard', () => {
  let component: HeaderDashboard;
  let fixture: ComponentFixture<HeaderDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
