import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualAnalytics } from './visual-analytics';

describe('VisualAnalytics', () => {
  let component: VisualAnalytics;
  let fixture: ComponentFixture<VisualAnalytics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualAnalytics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisualAnalytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
