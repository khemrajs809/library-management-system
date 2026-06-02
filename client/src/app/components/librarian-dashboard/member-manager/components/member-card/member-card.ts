import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-card.html',
  styleUrl: './member-card.css'
})
export class MemberCardComponent implements OnChanges {
  @Input() member: any = null;
  @Input() showDownload = true;
  @Input() barcodeId = 'memberBarcodeSvg';

  @ViewChild('cardElement') cardElement!: ElementRef;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['member'] && this.member) {
      setTimeout(() => this.renderBarcode(), 100);
    }
  }

  renderBarcode() {
    if (typeof document === 'undefined') return;
    const svg = document.getElementById(this.barcodeId);
    if (svg && this.member) {
      JsBarcode(svg, this.member.memberId, {
        format: 'CODE128',
        width: 2,
        height: 70,
        displayValue: false,
        margin: 0,
        background: 'transparent'
      });
    }
  }

  downloadCard() {
    if (!this.cardElement) return;
    setTimeout(() => {
      html2canvas(this.cardElement.nativeElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      }).then(c => {
        // High quality PDF export
        const pdf = new jsPDF('l', 'mm', [85.6, 54]);
        pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);
        pdf.save(`LMS_SmartCard_${this.member?.memberId}.pdf`);
      });
    }, 50);
  }

  isExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  }
}
