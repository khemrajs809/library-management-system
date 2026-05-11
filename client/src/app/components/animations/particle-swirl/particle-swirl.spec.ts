import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticleSwirl } from './particle-swirl';

describe('ParticleSwirl', () => {
  let component: ParticleSwirl;
  let fixture: ComponentFixture<ParticleSwirl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticleSwirl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticleSwirl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
