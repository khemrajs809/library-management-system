import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BorrowedBooksMonitoring } from './borrowed-books-monitoring';

describe('BorrowedBooksMonitoring', () => {
  let component: BorrowedBooksMonitoring;
  let fixture: ComponentFixture<BorrowedBooksMonitoring>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BorrowedBooksMonitoring]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BorrowedBooksMonitoring);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
