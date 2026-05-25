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
    member_id:         [null as string | null],
    name:              ['', Validators.required],
    dob:               ['', [Validators.required, minAgeValidator(5)]],
    gender:            ['Male', Validators.required],
    phone:             ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    email:             ['', [Validators.required, Validators.email]],
    curr_house:        ['', Validators.required],
    curr_street:       ['', Validators.required],
    curr_area:         ['', Validators.required],
    curr_city:         ['', Validators.required],
    curr_state:        ['', Validators.required],
    curr_pincode:      ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    perm_house:        ['', Validators.required],
    perm_street:       ['', Validators.required],
    perm_area:         ['', Validators.required],
    perm_city:         ['', Validators.required],
    perm_state:        ['', Validators.required],
    perm_pincode:      ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    course:            ['', Validators.required],
    department:        ['', Validators.required],
    year_semester:     ['', Validators.required],
    membership_type:   ['Student', Validators.required],
    roll_number:       ['', Validators.required],
    academic_session:  ['', Validators.required],
    hod_name:          [''],
    guardian_name:     ['', Validators.required],
    guardian_phone:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    blood_group:       ['', Validators.required],
    membership_expiry: [this.getOneYearExpiry(), Validators.required],
    max_book_limit:    [3],
    account_status:    ['Active'],
    no_dues_status:    [true],
    same_as_current:   [false],
    terms_accepted:    [false, Validators.requiredTrue]
  });

  private getOneYearExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.setupAddressSync();
    if (this.nextMemberId && !this.isEditing) {
      this.form.patchValue({ member_id: this.nextMemberId });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['nextMemberId'] && this.nextMemberId && !this.isEditing) {
      this.form.patchValue({ member_id: this.nextMemberId });
    }
    if (changes['initialData'] && this.initialData && this.isEditing) {
      this.populateForm(this.initialData);
    }
  }

  private setupAddressSync() {
    const currFields = ['curr_house', 'curr_street', 'curr_area', 'curr_city', 'curr_state', 'curr_pincode'];
    const permFields = ['perm_house', 'perm_street', 'perm_area', 'perm_city', 'perm_state', 'perm_pincode'];

    currFields.forEach((field, i) => {
      this.form.get(field)?.valueChanges.subscribe(val => {
        if (this.form.get('same_as_current')?.value) {
          this.form.patchValue({ [permFields[i]]: val }, { emitEvent: false });
        }
      });
    });

    this.form.get('same_as_current')?.valueChanges.subscribe(checked => {
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
      member_id: member.member_id, 
      name: member.name,
      dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : '',
      gender: member.gender || 'Male',
      phone: member.phone, 
      email: member.email,
      curr_house: member.curr_house,
      curr_street: member.curr_street,
      curr_area: member.curr_area,
      curr_city: member.curr_city,
      curr_state: member.curr_state,
      curr_pincode: member.curr_pincode,
      perm_house: member.perm_house,
      perm_street: member.perm_street,
      perm_area: member.perm_area,
      perm_city: member.perm_city,
      perm_state: member.perm_state,
      perm_pincode: member.perm_pincode,
      course: member.course,
      department: member.department,
      year_semester: member.year_semester,
      membership_type: member.membership_type || 'Student',
      roll_number: member.roll_number || '',
      academic_session: member.academic_session || '',
      hod_name: member.hod_name || '',
      guardian_name: member.guardian_name || '',
      guardian_phone: member.guardian_phone || '',
      blood_group: member.blood_group || '',
      membership_expiry: member.membership_expiry ? new Date(member.membership_expiry).toISOString().split('T')[0] : '',
      max_book_limit: member.max_book_limit ?? 5,
      account_status: member.account_status || 'Active',
      no_dues_status: !!member.no_dues_status
    });
    this.form.get('member_id')?.disable();
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
      membership_expiry: this.getOneYearExpiry(),
      gender: 'Male',
      membership_type: 'Student',
      max_book_limit: 3,
      account_status: 'Active',
      no_dues_status: true,
      same_as_current: false
    });
    this.form.get('member_id')?.enable();
    if (this.nextMemberId) {
      this.form.patchValue({ member_id: this.nextMemberId });
    }
    ['perm_house', 'perm_street', 'perm_area', 'perm_city', 'perm_state', 'perm_pincode'].forEach(f => {
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
