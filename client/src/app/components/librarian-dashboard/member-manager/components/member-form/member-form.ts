import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Member } from '../../../../../models/member.model';
import { ToastService } from '../../../../../services/toast.service';

export function minAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const dobDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
    }
    return age < minAge ? { minAge: true } : null;
  };
}

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './member-form.html',
  styleUrl: './member-form.css'
})
export class MemberFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  @Input() isEditing = false;
  @Input() initialData: Member | null = null;
  @Input() nextMemberId: string | null = null;

  @Output() onSave = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onFileSelect = new EventEmitter<{event: any, type: string}>();

  states: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 
    'Lakshadweep', 'Puducherry'
  ];

  form = this.fb.group({
    memberId:         [null as string | null],
    name:              ['', Validators.required],
    dob:               ['', [Validators.required, minAgeValidator(5)]],
    gender:            ['Male', Validators.required],
    phone:             ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    email:             ['', [Validators.required, Validators.email]],
    currHouse:        ['', Validators.required],
    currStreet:       ['', Validators.required],
    currArea:         ['', Validators.required],
    currCity:         ['', Validators.required],
    currState:        ['', Validators.required],
    currPincode:      ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    permHouse:        ['', Validators.required],
    permStreet:       ['', Validators.required],
    permArea:         ['', Validators.required],
    permCity:         ['', Validators.required],
    permState:        ['', Validators.required],
    permPincode:      ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    course:            ['', Validators.required],
    department:        ['', Validators.required],
    yearSemester:     ['', Validators.required],
    membershipType:   ['Student', Validators.required],
    rollNumber:       ['', Validators.required],
    academicSession:  ['', Validators.required],
    hodName:          [''],
    guardianName:     ['', Validators.required],
    guardianPhone:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    bloodGroup:       ['', Validators.required],
    membershipExpiry: [this.getOneYearExpiry(), Validators.required],
    maxBookLimit:    [3],
    accountStatus:    ['Active'],
    noDuesStatus:    [true],
    sameAsCurrent:   [false],
    termsAccepted:    [false, Validators.requiredTrue]
  });

  private getOneYearExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.setupAddressSync();
    if (this.nextMemberId && !this.isEditing) {
      this.form.patchValue({ memberId: this.nextMemberId });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['nextMemberId'] && this.nextMemberId && !this.isEditing) {
      this.form.patchValue({ memberId: this.nextMemberId });
    }
    if (changes['initialData'] && this.initialData && this.isEditing) {
      this.populateForm(this.initialData);
    }
  }

  private setupAddressSync() {
    const currFields = ['currHouse', 'currStreet', 'currArea', 'currCity', 'currState', 'currPincode'];
    const permFields = ['permHouse', 'permStreet', 'permArea', 'permCity', 'permState', 'permPincode'];

    currFields.forEach((field, i) => {
      this.form.get(field)?.valueChanges.subscribe(val => {
        if (this.form.get('sameAsCurrent')?.value) {
          this.form.patchValue({ [permFields[i]]: val }, { emitEvent: false });
        }
      });
    });

    this.form.get('sameAsCurrent')?.valueChanges.subscribe(checked => {
      permFields.forEach((field, i) => {
        const ctrl = this.form.get(field);
        if (checked) {
          ctrl?.disable();
          this.form.patchValue({ [field]: this.form.get(currFields[i])?.value });
        } else {
          ctrl?.enable();
        }
      });
    });
  }

  populateForm(member: Member) {
    this.form.patchValue({
      memberId: member.memberId, 
      name: member.name,
      dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : '',
      gender: member.gender || 'Male',
      phone: member.phone, 
      email: member.email,
      currHouse: member.currHouse,
      currStreet: member.currStreet,
      currArea: member.currArea,
      currCity: member.currCity,
      currState: member.currState,
      currPincode: member.currPincode,
      permHouse: member.permHouse,
      permStreet: member.permStreet,
      permArea: member.permArea,
      permCity: member.permCity,
      permState: member.permState,
      permPincode: member.permPincode,
      course: member.course,
      department: member.department,
      yearSemester: member.yearSemester,
      membershipType: member.membershipType || 'Student',
      rollNumber: member.rollNumber || '',
      academicSession: member.academicSession || '',
      hodName: member.hodName || '',
      guardianName: member.guardianName || '',
      guardianPhone: member.guardianPhone || '',
      bloodGroup: member.bloodGroup || '',
      membershipExpiry: member.membershipExpiry ? new Date(member.membershipExpiry).toISOString().split('T')[0] : '',
      maxBookLimit: member.maxBookLimit ?? 5,
      accountStatus: member.accountStatus || 'Active',
      noDuesStatus: !!member.noDuesStatus
    });
    this.form.get('memberId')?.disable();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fill all required fields correctly.');
      this.scrollToFirstInvalidControl();
      return;
    }
    this.onSave.emit(this.form.getRawValue());
  }

  reset() {
    this.form.reset({
      membershipExpiry: this.getOneYearExpiry(),
      gender: 'Male',
      membershipType: 'Student',
      maxBookLimit: 3,
      accountStatus: 'Active',
      noDuesStatus: true,
      sameAsCurrent: false
    });
    this.form.get('memberId')?.enable();
    if (this.nextMemberId) {
      this.form.patchValue({ memberId: this.nextMemberId });
    }
    ['permHouse', 'permStreet', 'permArea', 'permCity', 'permState', 'permPincode'].forEach(f => {
      this.form.get(f)?.enable();
    });
  }

  private scrollToFirstInvalidControl() {
    setTimeout(() => {
      // Specifically target input, select, and textarea elements that are invalid
      const firstInvalidControl = document.querySelector(
        'input.ng-invalid, select.ng-invalid, textarea.ng-invalid, [formControlName].ng-invalid'
      );
      
      if (firstInvalidControl) {
        firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Attempt to focus the element for immediate correction
        if (firstInvalidControl instanceof HTMLElement) {
          firstInvalidControl.focus();
        }
      }
    }, 100);
  }
}
