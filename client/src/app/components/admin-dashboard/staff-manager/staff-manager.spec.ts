import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffManager } from './staff-manager';

describe('StaffManager', () => {
  let component: StaffManager;
  let fixture: ComponentFixture<StaffManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
