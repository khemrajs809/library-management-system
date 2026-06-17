import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringOverview } from './monitoring-overview';

describe('MonitoringOverview', () => {
  let component: MonitoringOverview;
  let fixture: ComponentFixture<MonitoringOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonitoringOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonitoringOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
