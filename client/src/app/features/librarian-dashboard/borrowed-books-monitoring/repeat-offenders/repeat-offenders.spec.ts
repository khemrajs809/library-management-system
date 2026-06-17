import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepeatOffenders } from './repeat-offenders';

describe('RepeatOffenders', () => {
  let component: RepeatOffenders;
  let fixture: ComponentFixture<RepeatOffenders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepeatOffenders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepeatOffenders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
