import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberProfile } from '../../../models/member.model';
import { UPLOADS_BASE } from '../../../core/api.config';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-profile.component.html',
  styleUrl: './member-profile.component.css'
})
export class MemberProfileComponent implements OnChanges {
  @Input() viewingMember: MemberProfile | null = null;
  @Input() isProfileLoading = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onPayFine = new EventEmitter<number>();

  readonly uploadsBase = UPLOADS_BASE;
  today = new Date();
  private toastService = inject(ToastService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['viewingMember'] && this.viewingMember) {
      setTimeout(() => this.renderProfileBarcode(), 100);
    }
  }

  renderProfileBarcode() {
    if (typeof document === 'undefined') return;
    const svg = document.getElementById('profileBarcodeSvg');
    const pdfSvg = document.getElementById('pdfBarcodeSvg');
    if (this.viewingMember) {
      const opts = { format: 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 0 };
      if (svg) JsBarcode(svg, this.viewingMember.member.memberId, opts);
      if (pdfSvg) JsBarcode(pdfSvg, this.viewingMember.member.memberId, { ...opts, height: 50, width: 2 });
    }
  }

  async downloadProfile() {
    const element = document.getElementById('professionalProfilePdf');
    if (!element) return;
    
    this.toastService.info('Generating official profile report...');
    
    try {
      const canvas = await html2canvas(element, {
        scale: 3, // Higher quality for official docs
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Member_Profile_${this.viewingMember?.member.memberId}.pdf`);
      
      this.toastService.success('Profile downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      this.toastService.error('Failed to generate PDF');
    }
  }

  onModalClick(event: Event) {
    event.stopPropagation();
  }

  closeProfile() {
    this.onClose.emit();
  }
}
