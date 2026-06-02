import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

@Component({
  selector: 'app-issue-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './issue-form.html',
  styleUrl: './issue-form.css'
})
export class IssueFormComponent implements OnDestroy {
  @Input() recentActivity: any[] = [];
  @Output() onIssue = new EventEmitter<{ memberId: string, bookId: string }>();
  
  @ViewChild('memberInput') memberInput!: ElementRef;
  @ViewChild('bookInput') bookInput!: ElementRef;

  memberId = '';
  bookId = '';
  isScanningMember = false;
  isScanningBook = false;
  
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
    this.memberId = val;
  }

  onBookIdEnter(val: string) {
    this.bookId = val;
  }

  onIssueSubmit() {
    if (!this.memberId || !this.bookId) return;
    this.onIssue.emit({ 
      memberId: this.memberId, 
      bookId: this.bookId 
    });
    this.memberId = '';
    this.bookId = '';
    setTimeout(() => this.memberInput?.nativeElement.focus(), 100);
  }

  private async startCamera(videoId: string, onScan: (text: string) => void) {
    try {
      // Ensure any previous session is stopped
      this.codeReader.reset();
      
      // Wait a tiny bit for the DOM element to be ready
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
