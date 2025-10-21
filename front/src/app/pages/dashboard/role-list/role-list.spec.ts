import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleList } from './role-list';

describe('RoleList', () => {
  let component: RoleList;
  let fixture: ComponentFixture<RoleList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
