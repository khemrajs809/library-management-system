import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { UPLOADS_BASE } from '../../../../../core/api.config';

@Component({
  selector: 'app-issue-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './issue-form.component.html',
  styleUrl: './issue-form.component.css'
})
export class IssueFormComponent implements OnDestroy {
  @Input() recentActivity: any[] = [];
  @Input() members: any[] = [];
  @Input() books: any[] = [];
  
  @Output() onIssue = new EventEmitter<{ memberId: string, bookId: string }>();
  
  @ViewChild('memberInput') memberInput!: ElementRef;
  @ViewChild('bookInput') bookInput!: ElementRef;

  readonly uploadsBase = UPLOADS_BASE;

  memberId = '';
  bookId = '';
  isScanningMember = false;
  isScanningBook = false;
  
  previewMember: any = null;
  previewBook: any = null;
  previewCopyId: string = '';
  
  private codeReader = new BrowserMultiFormatReader();

  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128, 
      BarcodeFormat.QR_CODE, 
      BarcodeFormat.EAN_13, 
      BarcodeFormat.CODE_39
    ]);
    this.codeReader = new BrowserMultiFormatReader(hints);
  }

  onMemberIdEnter(val: string) {
    this.memberId = val.trim();
    if (!this.memberId) {
      this.previewMember = null;
      return;
    }
    const found = this.members.find(m => m.memberId === this.memberId);
    this.previewMember = found || null;
  }

  onBookIdEnter(val: string) {
    this.bookId = val.trim();
    if (!this.bookId) {
      this.previewBook = null;
      this.previewCopyId = '';
      return;
    }
    
    // Check if it's a copy ID (e.g., BK-5021-3)
    let parentBookId = this.bookId;
    let possibleCopyPart = '';
    
    const lastDash = this.bookId.lastIndexOf('-');
    if (lastDash > 0) {
      const suffix = this.bookId.substring(lastDash + 1);
      // If suffix is a number, it's likely a copy ID
      if (!isNaN(Number(suffix))) {
        parentBookId = this.bookId.substring(0, lastDash);
        possibleCopyPart = this.bookId;
      }
    }

    // Attempt lookup
    let found = this.books.find(b => b.bookId === this.bookId);
    if (!found && parentBookId !== this.bookId) {
       found = this.books.find(b => b.bookId === parentBookId);
    }
    
    if (found) {
       this.previewBook = found;
       this.previewCopyId = possibleCopyPart || found.bookId;
    } else {
       this.previewBook = null;
       this.previewCopyId = '';
    }
  }

  onIssueSubmit() {
    if (!this.memberId || !this.bookId) return;
    this.onIssue.emit({ 
      memberId: this.memberId, 
      bookId: this.bookId 
    });
    this.memberId = '';
    this.bookId = '';
    this.previewMember = null;
    this.previewBook = null;
    this.previewCopyId = '';
    setTimeout(() => this.memberInput?.nativeElement.focus(), 100);
  }

  private async startCamera(videoId: string, onScan: (text: string) => void) {
    try {
      this.codeReader.reset();
      await new Promise(resolve => setTimeout(resolve, 200));

      const videoElement = document.getElementById(videoId) as HTMLVideoElement;
      if (!videoElement) {
        console.error('Video element not found:', videoId);
        return;
      }

      await this.codeReader.decodeFromVideoDevice(null, videoId, (result, err) => {
        if (result) {
          onScan(result.getText());
        }
      });
    } catch (error) {
      console.error('Scanner Error:', error);
    }
  }

  toggleMemberScanner() {
    this.isScanningMember = !this.isScanningMember;
    if (this.isScanningMember) {
      this.isScanningBook = false;
      this.startCamera('member-reader', (text) => {
        this.memberId = text;
        this.onMemberIdEnter(text);
        this.toggleMemberScanner();
        setTimeout(() => this.bookInput?.nativeElement.focus(), 200);
      });
    } else {
      this.codeReader.reset();
    }
  }

  toggleBookScanner() {
    this.isScanningBook = !this.isScanningBook;
    if (this.isScanningBook) {
      this.isScanningMember = false;
      this.startCamera('book-reader', (text) => {
        this.bookId = text;
        this.onBookIdEnter(text);
        this.toggleBookScanner();
      });
    } else {
      this.codeReader.reset();
    }
  }

  ngOnDestroy() {
    this.codeReader.reset();
  }
}
