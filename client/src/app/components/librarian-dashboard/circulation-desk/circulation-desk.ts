import { Component, inject, signal, Input, ViewChild, ElementRef, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IssueService } from '../../../services/issue.service';
import { MemberService } from '../../../services/member.service';
import { BookService } from '../../../services/book.service';
import { Issue } from '../../../models/issue.model';
import { Member } from '../../../models/member.model';
import { Book } from '../../../models/book.model';
import { ToastService } from '../../../services/toast.service';
import { ModalService } from '../../../services/modal.service';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { UPLOADS_BASE } from '../../../core/api.config';

import { IssueFormComponent } from './components/issue-form/issue-form';
import { ActiveIssuesTableComponent } from './components/active-issues-table/active-issues-table';
import { ReturnScannerComponent } from './components/return-scanner/return-scanner';
import { ReturnHistoryComponent } from './components/return-history/return-history';

@Component({
  selector: 'app-circulation-desk',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    IssueFormComponent,
    ActiveIssuesTableComponent,
    ReturnScannerComponent,
    ReturnHistoryComponent
  ],
  templateUrl: './circulation-desk.html',
  styleUrl: './circulation-desk.css',
  encapsulation: ViewEncapsulation.None
})
export class CirculationDeskComponent {
  // Handles circulation operations (Issue, Return, History)
  private fb = inject(FormBuilder);
  private issueService = inject(IssueService);
  private memberService = inject(MemberService);
  private bookService = inject(BookService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);
  readonly uploadsBase = UPLOADS_BASE;

  @Input() set activeTab(tab: string) {
    this._activeTab = tab;
    if (tab === 'issues') this.loadIssues();
    if (tab === 'history') this.loadHistory();
    if (tab === 'scanner_mode') { this.scannerMember.set(null); setTimeout(() => this.scannerMemberInput?.nativeElement.focus(), 100); }
  }
  get activeTab() { return this._activeTab; }
  private _activeTab = 'issues';

  issues = signal<Issue[]>([]);
  history = signal<Issue[]>([]);

  issuesQuery = signal<string>('');
  historyQuery = signal<string>('');
  
  historyPage = signal<number>(1);
  historyPageSize = 10;
  
  issuesPage = signal<number>(1);
  issuesPageSize = 10;
  
  scannedIssue = signal<any | null>(null);
  issuePreview = signal<{ member: Member, book: Book, dueDate: string } | null>(null);
  currentDate = new Date();

  totalActiveCount = computed(() => this.issues().length);
  overdueCount = computed(() => this.issues().filter(i => this.isOverdue(i)).length);

  filteredIssues = computed(() => {
    const q = this.issuesQuery().toLowerCase();
    if (!q) return this.issues();
    return this.issues().filter(i =>
      i.member_name.toLowerCase().includes(q) ||
      i.book_title.toLowerCase().includes(q) ||
      i.member_id.toLowerCase().includes(q) ||
      i.book_id.toString().includes(q)
    );
  });

  paginatedIssues = computed(() => {
    const start = (this.issuesPage() - 1) * this.issuesPageSize;
    return this.filteredIssues().slice(start, start + this.issuesPageSize);
  });

  issuesPagination = computed(() => {
    const total = this.filteredIssues().length;
    const totalPages = Math.ceil(total / this.issuesPageSize) || 1;
    const current = this.issuesPage();
    
    const maxVisible = 10;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return {
      page: current,
      totalPages,
      total,
      pages
    };
  });

  nextIssuesPage() {
    if (this.issuesPage() < this.issuesPagination().totalPages) {
      this.issuesPage.update(p => p + 1);
    }
  }

  prevIssuesPage() {
    if (this.issuesPage() > 1) {
      this.issuesPage.update(p => p - 1);
    }
  }

  filteredHistory = computed(() => {
    const q = this.historyQuery().toLowerCase();
    if (!q) return this.history();
    return this.history().filter(h =>
      h.member_name.toLowerCase().includes(q) ||
      h.book_title.toLowerCase().includes(q) ||
      h.member_id.toLowerCase().includes(q) ||
      h.book_id.toString().includes(q)
    );
  });

  paginatedHistory = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize;
    return this.filteredHistory().slice(start, start + this.historyPageSize);
  });

  historyPagination = computed(() => {
    const total = this.filteredHistory().length;
    const totalPages = Math.ceil(total / this.historyPageSize) || 1;
    const current = this.historyPage();
    
    const maxVisible = 10;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return {
      page: current,
      totalPages,
      total,
      pages
    };
  });

  nextHistoryPage() {
    if (this.historyPage() < this.historyPagination().totalPages) {
      this.historyPage.update(p => p + 1);
    }
  }

  prevHistoryPage() {
    if (this.historyPage() > 1) {
      this.historyPage.update(p => p - 1);
    }
  }

  onIssuesSearch(val: string) {
    this.issuesQuery.set(val);
    this.issuesPage.set(1);
  }

  onHistorySearch(val: string) {
    this.historyQuery.set(val);
    this.historyPage.set(1);
  }

  setIssuesPage(p: number) {
    this.issuesPage.set(p);
  }

  setHistoryPage(p: number) {
    this.historyPage.set(p);
  }

  members = signal<Member[]>([]);
  books = signal<Book[]>([]);
  isIssuesLoading = signal<boolean>(false);
  isHistoryLoading = signal<boolean>(false);
  scannerMember = signal<Member | null>(null);
  isScannerProcessing = signal<boolean>(false);
  scannerMode = signal<'auto' | 'issue' | 'return'>('auto');
  recentActivity = signal<{ msg: string, type: 'success' | 'error', time: string }[]>([]);
  scanFeedback = signal<{ type: 'success' | 'error', active: boolean }>({ type: 'success', active: false });
  isMemberCameraActive = signal<boolean>(false);
  isBookCameraActive = signal<boolean>(false);
  isSideMemberScannerActive = signal<boolean>(false);
  isSideBookScannerActive = signal<boolean>(false);


  @ViewChild('memberIdInput') memberIdInput!: ElementRef;
  @ViewChild('bookIdInput') bookIdInput!: ElementRef;
  @ViewChild('scannerMemberInput') scannerMemberInput!: ElementRef;
  @ViewChild('scannerBookInput') scannerBookInput!: ElementRef;

  issueForm = this.fb.group({
    member_id: ['', Validators.required],
    book_id: ['', Validators.required]
  });

  constructor() {
    this.loadIssues();
    this.memberService.getMembers().subscribe({ next: (r) => this.members.set(r.data) });
    this.bookService.getBooks().subscribe({ next: (r) => this.books.set(r.data) });
  }

  loadIssues() {
    this.isIssuesLoading.set(true);
    this.issueService.getActiveIssues().subscribe({
      next: (r) => { 
        this.issues.set(r.data); 
        this.isIssuesLoading.set(false); 
      },
      error: () => { 
        this.toastService.error('Failed to load issues'); 
        this.isIssuesLoading.set(false); 
      }
    });
  }

  refreshAll() {
    this.loadIssues();
    this.loadHistory();
    this.memberService.getMembers().subscribe({ next: (r) => this.members.set(r.data) });
    this.bookService.getBooks().subscribe({ next: (r) => this.books.set(r.data) });
  }
  
  isOverdue = (issue: Issue) => {
    const due = new Date(issue.due_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return today > due;
  };

  loadHistory() {
    this.isHistoryLoading.set(true);
    setTimeout(() => {
      this.issueService.getHistory().subscribe({
        next: (r) => { this.history.set(r.data); this.isHistoryLoading.set(false); },
        error: () => { this.toastService.error('Failed to load history'); this.isHistoryLoading.set(false); }
      });
    }, 500);
  }

  issueBook() {
    if (this.issueForm.invalid) return;
    const { member_id, book_id } = this.issueForm.value;
    
    // Look up member and book details
    const member = this.members().find(m => m.member_id === member_id);
    const book = this.books().find(b => b.book_id === book_id);

    if (!member) {
      this.toastService.error(`Member ID "${member_id}" not found.`);
      return;
    }
    if (!book) {
      this.toastService.error(`Book ID "${book_id}" not found.`);
      return;
    }

    const due = new Date(); due.setDate(due.getDate() + 15);
    
    // Set the preview signal to show the detailed modal
    this.issuePreview.set({ member, book, dueDate: due.toLocaleDateString() });
  }

  confirmIssuePreview() {
    const preview = this.issuePreview();
    if (!preview) return;
    this.executeIssue(preview.member.member_id, preview.book.book_id);
    this.issuePreview.set(null);
  }

  cancelIssuePreview() {
    this.issuePreview.set(null);
  }

  executeIssue(member_id: string, book_id: string) {
    this.issueService.issueBook(member_id, book_id).subscribe({
      next: (r: any) => {
        this.toastService.success(`Book issued! Due: ${r.due_date}`);
        this.addActivity(`Issued ${book_id} to ${member_id}`, 'success');
        this.issueForm.reset(); this.loadIssues();
        this.bookService.getBooks().subscribe({ next: (rb) => this.books.set(rb.data) });
        setTimeout(() => this.memberIdInput?.nativeElement.focus(), 100);
      },
      error: (e) => {
        const msg = e.error?.message || 'Failed to issue book';
        this.addActivity(`Issue failed: ${msg}`, 'error');
        if (msg.toLowerCase().includes('stock')) {
          this.modalService.show({ title: 'Out of Stock', message: msg, type: 'warning' });
        } else {
          this.toastService.error(msg);
        }
      }
    });
  }

  returnBook(issue_id: number) {
    this.issueService.returnBook(issue_id).subscribe({
      next: (r: any) => {
        let txt = 'Book returned successfully!';
        if (r.fine_amount > 0) txt += ` Fine: ₹${r.fine_amount}`;
        this.toastService.success(txt);
        this.addActivity(`Returned issue #${issue_id}`, 'success');
        this.loadIssues();
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Failed to return');
        this.addActivity(`Return failed for issue #${issue_id}`, 'error');
      }
    });
  }

  renewBook(issue_id: number) {
    this.modalService.show({
      title: 'Renew Book',
      message: 'Extend the due date for this book by 15 more days?',
      type: 'info',
      confirmText: 'Renew Now',
      cancelText: 'Cancel',
      onConfirm: () => {
        this.issueService.renewBook(issue_id).subscribe({
          next: (r: any) => {
            this.toastService.success(`Renewed! New Due: ${r.new_due_date}`);
            this.addActivity(`Renewed issue #${issue_id}`, 'success');
            this.loadIssues();
          },
          error: (e) => {
            this.toastService.error(e.error?.message || 'Failed to renew');
            this.addActivity(`Renew failed for issue #${issue_id}`, 'error');
          }
        });
      }
    });
  }

  markAsLost(issue_id: number) {
    console.log('Marking issue as lost:', issue_id);
    this.modalService.show({
      title: 'Mark as Lost',
      message: 'Are you sure you want to mark this book as lost? A penalty (Book Price + ₹150) will be applied to the member\'s account.',
      type: 'warning',
      confirmText: 'Mark as Lost',
      cancelText: 'Cancel',
      onConfirm: () => {
        console.log('Confirmed lost for:', issue_id);
        this.issueService.markAsLost(issue_id).subscribe({
          next: (r: any) => {
            console.log('Lost marked successfully:', r);
            this.toastService.success(`Marked as lost. Penalty: ₹${r.fine_amount}`);
            this.addActivity(`Marked issue #${issue_id} as lost`, 'error');
            this.loadIssues();
          },
          error: (e) => {
            console.error('Error marking lost:', e);
            this.toastService.error(e.error?.message || 'Failed');
            this.addActivity(`Failed to mark issue #${issue_id} as lost`, 'error');
          }
        });
      }
    });
  }

  payFine(issue_id: number) {
    this.modalService.show({
      title: 'Confirm Payment',
      message: 'Are you sure you want to mark this fine as paid?',
      type: 'info',
      confirmText: 'Mark Paid',
      cancelText: 'Cancel',
      onConfirm: () => {
        this.issueService.payFine(issue_id).subscribe({
          next: (r) => {
            this.toastService.success(r.message);
            this.addActivity(`Fine paid for issue #${issue_id}`, 'success');
            this.loadIssues();
            this.loadHistory();
          },
          error: (e) => {
            this.toastService.error(e.error?.message || 'Failed');
            this.addActivity(`Failed to pay fine for issue #${issue_id}`, 'error');
          }
        });
      }
    });
  }

  onMemberIdEnter() { setTimeout(() => this.bookIdInput?.nativeElement.focus(), 50); }

  onScannerMemberEnter(event: any) {
    const id = event.target.value.trim(); if (!id) return;
    this.isScannerProcessing.set(true);
    this.memberService.getMember(id).subscribe({
      next: (r) => {
        this.scannerMember.set(r.data);
        this.isScannerProcessing.set(false);
        this.triggerFeedback('success');
        this.addActivity(`Session started for ${r.data.name}`, 'success');
        setTimeout(() => this.scannerBookInput?.nativeElement.focus(), 50);
      },
      error: () => {
        this.triggerFeedback('error');
        this.toastService.error(`Member ${id} not found.`);
        this.isScannerProcessing.set(false);
        event.target.value = '';
      }
    });
  }

  onScannerBookEnter(event: any) {
    const bookId = event.target.value.trim(); if (!bookId) return;
    this.isScannerProcessing.set(true);

    this.issueService.lookupIssueByBookId(bookId).subscribe({
      next: (r: any) => {
        this.scannedIssue.set(r.data);
        this.addActivity(`Lookup successful for ${bookId}`, 'success');
        this.triggerFeedback('success');
        this.isScannerProcessing.set(false);
      },
      error: (e) => {
        const msg = e.error?.message || 'Lookup failed';
        this.toastService.error(msg);
        this.addActivity(msg, 'error');
        this.triggerFeedback('error');
        this.isScannerProcessing.set(false);
        event.target.value = '';
        setTimeout(() => this.scannerBookInput?.nativeElement.focus(), 50);
      }
    });
  }

  confirmQuickReturn() {
    const issue = this.scannedIssue();
    if (!issue) return;
    this.isScannerProcessing.set(true);

    this.issueService.returnBook(issue.issue_id).subscribe({
      next: (r: any) => {
        const msg = `Returned: ${issue.book_title}${r.fine_amount > 0 ? ' (Fine: ₹' + r.fine_amount + ')' : ''}`;
        this.toastService.success(msg);
        this.addActivity(msg, 'success');
        this.triggerFeedback('success');
        this.cancelQuickReturn();
        this.loadIssues();
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Return failed');
        this.isScannerProcessing.set(false);
      }
    });
  }

  renewQuickReturn() {
    const issue = this.scannedIssue();
    if (!issue) return;
    this.isScannerProcessing.set(true);

    this.issueService.renewBook(issue.issue_id).subscribe({
      next: (r: any) => {
        const msg = `Renewed: ${issue.book_title}. New Due: ${r.new_due_date}`;
        this.toastService.success(msg);
        this.addActivity(msg, 'success');
        this.triggerFeedback('success');
        this.cancelQuickReturn();
        this.loadIssues();
      },
      error: (e) => {
        this.toastService.error(e.error?.message || 'Renew failed');
        this.isScannerProcessing.set(false);
      }
    });
  }

  cancelQuickReturn() {
    this.scannedIssue.set(null);
    this.isScannerProcessing.set(false);
    setTimeout(() => this.scannerBookInput?.nativeElement.focus(), 50);
  }

  private handleScanError(e: any, event: any) {
    const msg = e.error?.message || 'Action failed';
    if (msg.toLowerCase().includes('stock')) {
      this.modalService.show({ title: 'Out of Stock', message: msg, type: 'warning' });
    } else {
      this.toastService.error(msg);
    }
    this.addActivity(msg, 'error');
    this.triggerFeedback('error');
    this.isScannerProcessing.set(false);
    event.target.value = '';
    setTimeout(() => this.scannerBookInput?.nativeElement.focus(), 50);
  }

  private triggerFeedback(type: 'success' | 'error') {
    this.scanFeedback.set({ type, active: true });
    setTimeout(() => this.scanFeedback.set({ type, active: false }), 600);
  }

  private addActivity(msg: string, type: 'success' | 'error') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.recentActivity.update(list => [{ msg, type, time }, ...list].slice(0, 5));
  }

  finishSession() {
    this.scannerMember.set(null);
    this.recentActivity.set([]);
    setTimeout(() => this.scannerMemberInput?.nativeElement.focus(), 50);
  }

  finishScan(event: any) {
    this.loadIssues();
    if (event?.target) event.target.value = '';

    // Keep it "processing" for a short moment so camera doesn't double-scan
    setTimeout(() => {
      this.scannerMember.set(null);
      this.isScannerProcessing.set(false);
      this.addActivity('Ready for next member scan...', 'success');
      setTimeout(() => this.scannerMemberInput?.nativeElement.focus(), 50);
    }, 2000);
  }

  private codeReader = new BrowserMultiFormatReader();

  private startCamera(videoId: string, onScan: (text: string) => void) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8
    ]);
    
    // Re-initialize reader with the proper hints to ensure all formats (especially CODE_128) are actively scanned
    this.codeReader = new BrowserMultiFormatReader(hints);

    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      }
    };

    // Use constraints to get a high-quality video feed for much better 1D barcode recognition
    this.codeReader.decodeFromConstraints(constraints, videoId, (result, err) => {
      if (result) {
        onScan(result.getText());
      }
    });
  }

  toggleMemberCamera() {
    this.isMemberCameraActive.update(v => !v);
    if (this.isMemberCameraActive()) {
      setTimeout(() => this.startCamera('reader-member', (text) => {
        this.onScannerMemberEnter({ target: { value: text } });
        this.toggleMemberCamera();
      }), 100);
    } else {
      this.stopMemberCamera();
    }
  }

  private stopMemberCamera() {
    this.codeReader.reset();
    this.isMemberCameraActive.set(false);
  }

  toggleBookCamera() {
    this.isBookCameraActive.update(v => !v);
    if (this.isBookCameraActive()) {
      setTimeout(() => this.startCamera('reader-book', (text) => {
        this.onScannerBookEnter({ target: { value: text } });
        this.toggleBookCamera();
      }), 100);
    } else {
      this.stopBookCamera();
    }
  }

  private stopBookCamera() {
    this.codeReader.reset();
    this.isBookCameraActive.set(false);
  }

  toggleSideMemberScanner() {
    this.isSideMemberScannerActive.update(v => !v);
    if (this.isSideMemberScannerActive()) {
      this.stopSideBookScanner();
      setTimeout(() => this.startCamera('reader-side-member', (text) => {
        this.issueForm.patchValue({ member_id: text });
        this.onMemberIdEnter();
        this.toggleSideMemberScanner();
      }), 100);
    } else {
      this.stopSideMemberScanner();
    }
  }

  private stopSideMemberScanner() {
    this.codeReader.reset();
    this.isSideMemberScannerActive.set(false);
  }

  toggleSideBookScanner() {
    this.isSideBookScannerActive.update(v => !v);
    if (this.isSideBookScannerActive()) {
      this.stopSideMemberScanner();
      setTimeout(() => this.startCamera('reader-side-book', (text) => {
        this.issueForm.patchValue({ book_id: text });
        this.toggleSideBookScanner();
      }), 100);
    } else {
      this.stopSideBookScanner();
    }
  }

  private stopSideBookScanner() {
    this.codeReader.reset();
    this.isSideBookScannerActive.set(false);
  }

  onScannerBookManual(value: string) {
    if (!value.trim()) return;
    this.onScannerBookEnter({ target: { value } });
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  ngOnDestroy() {
    this.stopMemberCamera();
    this.stopBookCamera();
    this.stopSideMemberScanner();
    this.stopSideBookScanner();
  }
}
