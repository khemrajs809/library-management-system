import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

@Component({
  selector: 'app-return-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-scanner.component.html',
  styleUrl: './return-scanner.component.css'
})
export class ReturnScannerComponent implements OnDestroy {
  @Input() scannedIssue: any | null = null;
  @Input() uploadsBase = '';
  @Input() isProcessing = false;
  @Input() scanFeedback: { type: 'success' | 'error', active: boolean } = { type: 'success', active: false };
  @Input() recentActivity: any[] = [];

  @Output() onBookScan = new EventEmitter<string>();
  @Output() onConfirmReturn = new EventEmitter<void>();
  @Output() onConfirmRenew = new EventEmitter<void>();
  @Output() onCancelLookup = new EventEmitter<void>();
  @Output() onFinishSession = new EventEmitter<void>();

  @ViewChild('memberIdInput') memberIdInput!: ElementRef;
  @ViewChild('bookIdInput') bookIdInput!: ElementRef;

  isMemberCameraActive = false;
  isBookCameraActive = false;
  private codeReader = new BrowserMultiFormatReader();

  isOverdue(issue: any): boolean {
    if (!issue) return false;
    const due = new Date(issue.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    return due < today;
  }

  toggleBookCamera() {
    this.isBookCameraActive = !this.isBookCameraActive;
    if (this.isBookCameraActive) {
      setTimeout(() => this.startCamera('reader-book', (text) => {
        this.onBookScan.emit(text);
        this.toggleBookCamera();
      }), 100);
    } else {
      this.codeReader.reset();
    }
  }

  private startCamera(videoId: string, onScan: (text: string) => void) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
    this.codeReader = new BrowserMultiFormatReader(hints);
    this.codeReader.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoId, (result) => {
      if (result) onScan(result.getText());
    }).catch(err => {
      console.error('Camera Error:', err);
      this.isBookCameraActive = false;
    });
  }

  emitBookScan(event: any) {
    const val = event.target ? event.target.value.trim() : event.value.trim();
    if (val) {
      this.onBookScan.emit(val);
      if (event.target) event.target.value = '';
    }
  }

  focusBookInput() {
    setTimeout(() => this.bookIdInput?.nativeElement.focus(), 50);
  }

  ngOnDestroy() {
    this.codeReader.reset();
  }
}
