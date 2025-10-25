import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolePanel } from './role-panel';

describe('RolePanel', () => {
  let component: RolePanel;
  let fixture: ComponentFixture<RolePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolePanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
