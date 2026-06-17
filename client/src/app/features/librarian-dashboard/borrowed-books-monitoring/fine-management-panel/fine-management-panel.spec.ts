import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FineManagementPanel } from './fine-management-panel';

describe('FineManagementPanel', () => {
  let component: FineManagementPanel;
  let fixture: ComponentFixture<FineManagementPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FineManagementPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FineManagementPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
