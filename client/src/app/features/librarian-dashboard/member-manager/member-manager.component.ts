import { Component, inject, signal, computed, Input, Output, EventEmitter, ViewChild, SimpleChanges, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MemberService } from '../../../services/member.service';
import { ToastService } from '../../../services/toast.service';
import { Member } from '../../../models/member.model';
import { UPLOADS_BASE } from '../../../core/api.config';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { EmailSenderComponent } from '../email-sender/email-sender.component';
import { ModalService } from '../../../services/modal.service';
import { RefreshService } from '../../../services/refresh.service';
import { Subscription } from 'rxjs';

// New Sub-components
import { MemberTableComponent } from './components/member-table/member-table.component';
import { MemberCardComponent } from './components/member-card/member-card.component';
import { MemberFormComponent } from './components/member-form/member-form.component';

@Component({
  selector: 'app-member-manager',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    EmailSenderComponent,
    MemberTableComponent,
    MemberCardComponent,
    MemberFormComponent
  ],
  templateUrl: './member-manager.component.html',
  styleUrl: './member-manager.component.css'
})
export class MemberManagerComponent implements OnInit, OnChanges, OnDestroy {
  private memberService = inject(MemberService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);
  public refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  @Input() activeTab = 'member_directory';
  @Output() openProfile = new EventEmitter<string>();
  @Output() tabChange   = new EventEmitter<string>();

  @ViewChild('memberForm') memberForm!: MemberFormComponent;
  @ViewChild('directoryCard') directoryCard!: MemberCardComponent;

  members            = signal<Member[]>([]);
  pagination         = signal<any>({ page: 1, limit: 10, totalPages: 1, total: 0 });
  recentActivities   = signal<any[]>([]);
  searchedMemberInfo = signal<Member | null>(null);
  isEditing          = signal<boolean>(false);
  memberSearch       = signal<string>('');
  isScannerActive    = signal<boolean>(false);
  isImporting        = signal<boolean>(false);
  isLoading          = signal<boolean>(false);
  importResult       = signal<any>(null);
  selectedEmail      = signal<string | null>(null);
  selectedMember     = signal<Member | null>(null);
  nextMemberId       = signal<string | null>(null);
  
  // For ID Card Preview
  previewMember      = signal<any>(null);

  selectedMemberId: string | null = null;
  selectedFile: File | null = null;
  selectedGovtId: File | null = null;
  selectedAdmissionReceipt: File | null = null;
  selectedSecurityDeposit: File | null = null;
  readonly uploadsBase = UPLOADS_BASE;

  constructor() { 
    this.loadMembers(); 
    this.loadActivities();
  }

  ngOnInit() {
    this.fetchNextId();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.refreshData();
    });
  }

  refreshData() {
    this.loadMembers();
    this.loadActivities();
    this.fetchNextId();
    setTimeout(() => this.refreshService.completeRefresh(), 800);
  }

  ngOnDestroy() {
    if (this.refreshSub) this.refreshSub.unsubscribe();
    this.stopScanner();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeTab'] && this.activeTab === 'register_member') {
      this.fetchNextId();
    }
  }

  fetchNextId() {
    if (!this.isEditing() && this.activeTab === 'register_member') {
      this.memberService.generateUniqueId().subscribe({
        next: (r: any) => this.nextMemberId.set(r.id),
        error: () => this.toastService.error('Failed to generate unique Member ID')
      });
    }
  }

  loadActivities() {
    this.memberService.getRecentActivities().subscribe({
      next: (r) => this.recentActivities.set(r.data),
      error: () => console.error('Failed to load recent activities')
    });
  }

  loadMembers(q = '', page = 1) {
    this.isLoading.set(true);
    this.memberService.getMembers(q, page, this.pagination().limit).subscribe({
      next: (r) => {
        this.members.set(r.data);
        if (r.pagination) this.pagination.set(r.pagination);
        this.isLoading.set(false);
      },
      error: (err) => { this.toastService.error(err.error?.message || 'Failed to load members'); this.isLoading.set(false); }
    });
  }

  onMemberSearch(q: string) { 
    this.memberSearch.set(q); 
    this.loadMembers(q, 1); 
  }

  onPageChange(p: number) {
    this.loadMembers(this.memberSearch(), p);
  }

  onFileSelected(data: {event: any, type: string}) { 
    const file = data.event.target.files[0];
    if (!file) return;
    const type = data.type;
    if (type === 'photo') this.selectedFile = file;
    else if (type === 'govt_id') this.selectedGovtId = file;
    else if (type === 'admission_receipt') this.selectedAdmissionReceipt = file;
    else if (type === 'security_deposit') this.selectedSecurityDeposit = file;
  }

  saveMember(formData: any) {
    const fd = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        fd.append(key, formData[key].toString());
      }
    });

    // Build legacy formatted strings for backend/ID card
    const currAddr = `${formData.currHouse}, ${formData.currStreet}, ${formData.currArea}, ${formData.currCity}, ${formData.currState} - ${formData.currPincode}`;
    const permAddr = `${formData.permHouse}, ${formData.permStreet}, ${formData.permArea}, ${formData.permCity}, ${formData.permState} - ${formData.permPincode}`;
    fd.append('currentAddress', currAddr);
    fd.append('permanentAddress', permAddr);

    if (this.selectedFile) fd.append('photo', this.selectedFile);
    if (this.selectedGovtId) fd.append('govt_id', this.selectedGovtId);
    if (this.selectedAdmissionReceipt) fd.append('admission_receipt', this.selectedAdmissionReceipt);
    if (this.selectedSecurityDeposit) fd.append('security_deposit', this.selectedSecurityDeposit);

    const action = this.isEditing() 
      ? this.memberService.updateMember(this.selectedMemberId!, fd)
      : this.memberService.addMember(fd);

    action.subscribe({
      next: (res: any) => {
        this.toastService.success(res.message);
        if (!this.isEditing()) {
          this.previewMember.set({
            ...formData,
            photoUrl: res.photoUrl ? `${UPLOADS_BASE}${res.photoUrl}` : null
          });
        }
        this.resetForm();
        this.loadMembers();
        this.loadActivities();
        if (!this.isEditing() && res.memberId) {
          this.memberService.getMember(res.memberId).subscribe({
            next: (r) => this.selectedMember.set(r.data)
          });
        }
      },
      error: (e) => this.toastService.error(e.error?.message || 'Operation failed')
    });
  }

  editMember(member: Member) {
    this.isEditing.set(true);
    this.selectedMember.set(member); // Set the member data for the form
    this.selectedMemberId = member.memberId;
    this.previewMember.set(null);
    this.tabChange.emit('register_member');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    this.isEditing.set(false);
    this.selectedMember.set(null);
    this.selectedMemberId = null;
    this.selectedFile = null;
    this.selectedGovtId = null;
    this.selectedAdmissionReceipt = null;
    this.selectedSecurityDeposit = null;
    if (this.memberForm) this.memberForm.reset();
    this.fetchNextId();
  }

  deleteMember(member: Member) {
    this.modalService.confirm({
      title: 'Confirm Deletion',
      subtitle: 'MEMBER IDENTITY',
      message: `Are you sure you want to remove this member?`,
      image: member.photoUrl ? (this.uploadsBase + member.photoUrl) : undefined,
      metadata: [
        { label: 'Member ID', value: member.memberId, color: '#ef4444' },
        { label: 'Name', value: member.name },
        { label: 'Course & Dept', value: `${member.course || 'N/A'} (${member.department || 'N/A'})` },
        { label: 'Year/Sem & Session', value: `${member.yearSemester || 'N/A'} | ${member.academicSession || 'N/A'}` },
        { label: 'Membership Type', value: member.membershipType || 'Other' },
        { label: 'Status / Dues', value: `${member.accountStatus || 'Active'} | ${member.noDuesStatus === 1 ? 'Clear' : 'Pending'}` },
        { label: 'Contact', value: member.phone || 'N/A' },
        { label: 'Email Address', value: member.email || 'N/A', fullWidth: true }
      ],
      type: 'danger',
      confirmText: 'Delete Member',
      onConfirm: () => {
        this.memberService.deleteMember(member.memberId).subscribe({
          next: (r) => { this.toastService.success(r.message); this.loadMembers(this.memberSearch()); },
          error: (e) => this.toastService.error(e.error?.message || 'Failed to delete member')
        });
      }
    });
  }

  viewDetails(member: Member) {
    this.memberService.getMember(member.memberId).subscribe({
      next: (r) => this.selectedMember.set(r.data),
      error: () => this.toastService.error('Failed to load member details')
    });
  }

  downloadCard(member: Member) {
    this.previewMember.set({ 
      ...member, 
      photoUrl: member.photoUrl ? `${UPLOADS_BASE}${member.photoUrl}` : null 
    });

    // Wait for the signal to propagate to the hidden card, then trigger download
    setTimeout(() => {
      if (this.directoryCard) {
        this.directoryCard.downloadCard();
      }
    }, 150);
  }

  onCsvSelected(e: any) {
    const file = e.target.files[0]; 
    if (!file) return;
    this.isImporting.set(true);
    const fd = new FormData(); 
    fd.append('csv', file);
    this.memberService.importMembers(fd).subscribe({
      next: (r) => { 
        this.importResult.set(r.results); 
        this.toastService.success(r.message); 
        this.loadMembers(); 
        this.isImporting.set(false); 
      },
      error: (e) => { 
        this.toastService.error(e.error?.message || 'Import failed'); 
        this.isImporting.set(false); 
      }
    });
    e.target.value = '';
  }

  toggleScanner() {
    this.isScannerActive.update(v => !v);
    if (this.isScannerActive()) setTimeout(() => this.startScanner(), 100);
    else this.stopScanner();
  }

  private codeReader = new BrowserMultiFormatReader();
  private startScanner() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128]);
    this.codeReader.decodeFromVideoDevice(null, "member-reader", (result) => {
      if (result) {
        this.onMemberSearch(result.getText());
        this.toggleScanner();
      }
    });
  }
  private stopScanner() { this.codeReader.reset(); }

  openEmailSender(email: string) {
    if (!email) {
      this.toastService.error('This member does not have an email address.');
      return;
    }
    this.selectedEmail.set(email);
  }

  closeMemberDetails() {
    this.selectedMember.set(null);
  }

  closeImportReport() {
    this.importResult.set(null);
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  onEmailClose() {
    this.selectedEmail.set(null);
  }

  onPhotoError() {
    const member = this.selectedMember();
    if (member) {
      member.photoUrl = undefined;
      this.selectedMember.set({ ...member });
    }
  }

  // ngOnDestroy moved up
}
