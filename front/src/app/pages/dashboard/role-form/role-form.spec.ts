import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleForm } from './role-form';

describe('RoleForm', () => {
  let component: RoleForm;
  let fixture: ComponentFixture<RoleForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
