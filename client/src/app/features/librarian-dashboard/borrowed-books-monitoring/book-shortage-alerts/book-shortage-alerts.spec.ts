import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookShortageAlerts } from './book-shortage-alerts';

describe('BookShortageAlerts', () => {
  let component: BookShortageAlerts;
  let fixture: ComponentFixture<BookShortageAlerts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookShortageAlerts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookShortageAlerts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
