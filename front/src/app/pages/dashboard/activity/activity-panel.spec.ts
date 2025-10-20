import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityPanel } from './activity-panel';

describe('ActivityPanel', () => {
  let component: ActivityPanel;
  let fixture: ComponentFixture<ActivityPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityPanel]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
