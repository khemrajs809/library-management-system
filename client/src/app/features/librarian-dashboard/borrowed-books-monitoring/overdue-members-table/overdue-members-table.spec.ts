import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverdueMembersTable } from './overdue-members-table';

describe('OverdueMembersTable', () => {
  let component: OverdueMembersTable;
  let fixture: ComponentFixture<OverdueMembersTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverdueMembersTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverdueMembersTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
