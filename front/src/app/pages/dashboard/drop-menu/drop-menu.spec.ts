import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropMenu } from './drop-menu';

describe('DropMenu', () => {
  let component: DropMenu;
  let fixture: ComponentFixture<DropMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
