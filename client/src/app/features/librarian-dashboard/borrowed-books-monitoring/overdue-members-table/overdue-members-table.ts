import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-overdue-members-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overdue-members-table.html',
  styleUrl: './overdue-members-table.css'
})
export class OverdueMembersTable {
  @Input() data: any[] = [];
  
  searchQuery = signal('');
  filterStatus = signal('All');

  get filteredMembers() {
    if (!this.data) return [];
    
    // Process status based on days overdue
    const membersWithStatus = this.data.map(m => {
      let status = 'Overdue';
      if (m.daysOverdue <= 2) status = 'Due Soon';
      else if (m.daysOverdue >= 30 && m.daysOverdue < 60) status = 'Critical Delay';
      else if (m.daysOverdue >= 60) status = 'Lost Book Suspected';
      
      return { 
        ...m, 
        status,
        avatar: m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`
      };
    });

    return membersWithStatus.filter(m => {
      const q = this.searchQuery().toLowerCase();
      const matchesSearch = 
        m.name.toLowerCase().includes(q) || 
        m.memberId.toLowerCase().includes(q) || 
        m.bookName.toLowerCase().includes(q) ||
        m.isbn.includes(q);
      
      const matchesStatus = this.filterStatus() === 'All' || m.status === this.filterStatus();

      return matchesSearch && matchesStatus;
    });
  }

  isMessageModalOpen = signal(false);
  selectedMemberForMessage = signal<any>(null);
  messageContent = signal('');
  autoMessagingEnabled = signal(false);
  
  toastMessage = signal('');
  toastVisible = signal(false);

  showToast(message: string) {
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    setTimeout(() => {
      this.toastVisible.set(false);
    }, 4000);
  }

  toggleAutoMessaging(enabled: boolean) {
    this.autoMessagingEnabled.set(enabled);
    if (enabled) {
      console.log('Auto-Messaging Activated');
      // Simulate auto-dispatch logic
      setTimeout(() => {
        this.showToast('Auto-Messaging Activated: Reminders (7d), Warnings (10d), and Notices (15d) scheduled.');
      }, 300);
    } else {
      this.showToast('Auto-Messaging Disabled.');
    }
  }

  sendReminder(member: any) {
    this.selectedMemberForMessage.set(member);
    this.messageContent.set(`Subject: Reminder - Overdue Book Return\n\nDear ${member.name},\n\nThis is a friendly reminder that the book "${member.bookName}" (ISBN: ${member.isbn}) you borrowed was due on ${new Date(member.dueDate).toLocaleDateString()}. It is currently overdue by ${member.daysOverdue} days.\n\nTo avoid any late fees, we kindly request you to return it to the library as soon as possible. If you have already returned the book, please disregard this message.\n\nThank you,\nLibrary Administration`);
    this.isMessageModalOpen.set(true);
  }

  sendWarn(member: any) {
    this.selectedMemberForMessage.set(member);
    this.messageContent.set(`Subject: Warning - Overdue Book Return\n\nDear ${member.name},\n\nWe are writing to issue a formal warning regarding the book "${member.bookName}" (ISBN: ${member.isbn}), which is now overdue by ${member.daysOverdue} days.\n\nYour account currently shows an outstanding fine of ₹${member.fineAmount}. Please return the book immediately. Failure to do so within the next 48 hours may lead to temporary suspension of your library privileges.\n\nRegards,\nLibrary Administration`);
    this.isMessageModalOpen.set(true);
  }

  sendNotice(member: any) {
    this.selectedMemberForMessage.set(member);
    this.messageContent.set(`Subject: FINAL NOTICE - Immediate Action Required\n\nDear ${member.name},\n\nThis is an OFFICIAL NOTICE regarding the unreturned book "${member.bookName}" (ISBN: ${member.isbn}), currently overdue by ${member.daysOverdue} days.\n\nDespite previous reminders, the item has not been returned. Your borrowing privileges are now at risk of permanent suspension. You are required to return the book and clear all pending dues immediately.\n\nFailure to resolve this matter may result in administrative action.\n\nSincerely,\nLibrary Administration`);
    this.isMessageModalOpen.set(true);
  }

  getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  }

  async downloadNotice(member: any) {
    this.showToast(`Generating Official PDF Notice for ${member.name}...`);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;
    
    // Header section
    try {
      // Use the actual project logo
      const imgData = await this.getBase64ImageFromURL('/logolms.webp');
      doc.addImage(imgData, 'PNG', 15, 10, 30, 16); // Smaller logo, tighter margin
    } catch (e) {
      console.warn('Project logo not found at /logolms.webp, omitting logo from PDF.', e);
    }
    
    // Header Text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18); // Slightly bigger to balance the tighter header
    doc.setFont('times', 'bold');
    doc.text('CENTRAL LIBRARY', pageWidth - 15, 22, { align: 'right' });
    
    // Divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 30, pageWidth - 15, 30);
    currentY = 38;
    
    // Ref & Date
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text(`Ref No:`, 15, currentY);
    doc.setFont('times', 'normal');
    doc.text(` LMS-NOTICE-${Math.floor(Math.random() * 10000)}`, 30, currentY);
    
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFont('times', 'bold');
    doc.text(`Date:`, pageWidth - 55, currentY);
    doc.setFont('times', 'normal');
    doc.text(` ${dateStr}`, pageWidth - 43, currentY);
    
    currentY += 12;
    
    // To Section
    doc.setFont('times', 'bold');
    doc.text('To,', 15, currentY);
    currentY += 5;
    doc.text(`${member.name}`, 15, currentY);
    currentY += 5;
    doc.setFont('times', 'normal');
    doc.text(`Member ID: #${member.memberId} (${member.type || 'Student'})`, 15, currentY);
    currentY += 5;
    doc.text(`Contact: ${member.mobile} | ${member.email}`, 15, currentY);
    
    // Divider
    currentY += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, currentY, pageWidth - 15, currentY);
    
    // Subject
    currentY += 10;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('SUBJECT: FINAL NOTICE FOR OVERDUE LIBRARY MATERIAL & ACADEMIC HOLD', pageWidth / 2, currentY, { align: 'center' });
    
    // Salutation
    currentY += 12;
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Dear ${member.name},`, 15, currentY);
    
    // Body 1
    currentY += 8;
    const p1 = `This letter serves as an official and final notice regarding the library material issued under your account. According to our automated records, the following item remains significantly overdue despite multiple prior reminders:`;
    const p1Lines = doc.splitTextToSize(p1, pageWidth - 30); // Less margin
    doc.text(p1Lines, 15, currentY);
    currentY += p1Lines.length * 5 + 4; // Tighter line height
    
    // Record Box/List
    doc.setFont('times', 'bold');
    doc.text('Overdue Material Record', 20, currentY);
    currentY += 5;
    
    doc.text('* Book Title:', 25, currentY); doc.setFont('times', 'normal'); doc.text(` ${member.bookName || 'N/A'}`, 50, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('* Accession No:', 25, currentY); doc.setFont('times', 'normal'); doc.text(` #BK-${member.isbn ? member.isbn.substring(0,4) : '1000'}`, 55, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('* ISBN:', 25, currentY); doc.setFont('times', 'normal'); doc.text(` ${member.isbn || 'N/A'}`, 40, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('* Original Due Date:', 25, currentY); doc.setFont('times', 'normal'); doc.text(` ${member.dueDate ? new Date(member.dueDate).toLocaleDateString('en-GB') : 'N/A'}`, 60, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('* Days Overdue:', 25, currentY); doc.setFont('times', 'normal'); doc.text(` ${member.daysOverdue || 0} Days`, 55, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('* Accumulated Fine:', 25, currentY); doc.setFont('times', 'italic'); doc.text(` Rs. ${member.fineAmount || 0}.00 (Subject to policy terms)`, 60, currentY); 
    currentY += 8;
    
    // Body 2
    doc.setFont('times', 'normal');
    const p2 = `The continued retention of this book constitutes a direct violation of the University Library Borrowing Policy.\n\nYou are hereby directed to return the book to the circulation desk and clear all administrative flags immediately upon receipt of this notice.`;
    const p2Lines = doc.splitTextToSize(p2, pageWidth - 30);
    doc.text(p2Lines, 15, currentY);
    currentY += p2Lines.length * 5 + 4;
    
    // Important Notice Box
    doc.setFillColor(250, 245, 245);
    doc.rect(15, currentY, pageWidth - 30, 42, 'F');
    doc.setDrawColor(220, 38, 38); // Red border left
    doc.setLineWidth(1.5);
    doc.line(15, currentY, 15, currentY + 42);
    
    currentY += 6;
    doc.setFont('times', 'bold');
    doc.text('IMPORTANT NOTICE OF CONSEQUENCES', 20, currentY);
    currentY += 5;
    
    doc.setFont('times', 'normal');
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 2);
    const deadlineStr = deadlineDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const boxText = `Failure to comply within 48 hours (by ${deadlineStr}) will compel the Library Administration to escalate this matter to University Authorities. Immediate disciplinary actions will include:`;
    const boxLines = doc.splitTextToSize(boxText, pageWidth - 40);
    doc.text(boxLines, 20, currentY);
    currentY += boxLines.length * 5 + 2;
    
    doc.text('1. Permanent suspension of your library membership and borrowing privileges.', 25, currentY); currentY += 5;
    doc.setFont('times', 'bold'); doc.text('2. Withholding of your Academic No-Dues Clearance', 25, currentY); doc.setFont('times', 'normal'); doc.text(', which will restrict access to', 116, currentY); currentY += 5;
    doc.text('    exam hall tickets, results, and official transcripts.', 25, currentY); currentY += 5;
    doc.text('3. Additional late-fee penalties levied directly onto your student account portal.', 25, currentY);
    
    currentY += 12;
    doc.text('Please treat this matter with the utmost urgency to prevent immediate academic escalation.', 15, currentY);
    
    // Sign off
    currentY += 12;
    doc.text('Yours sincerely,', 15, currentY);
    currentY += 12;
    
    // Signature
    doc.setFont('times', 'bold');
    doc.text('Library Coordinator', 15, currentY); currentY += 5;
    doc.setFont('times', 'normal');
    doc.text('Central Library', 15, currentY);
    
    const safeFileName = (member.name || 'Member').replace(/ /g, '_');
    doc.save(`Notice_${safeFileName}.pdf`);
  }

  closeMessageModal() {
    this.isMessageModalOpen.set(false);
    this.selectedMemberForMessage.set(null);
  }

  sendMessage() {
    console.log('Sending warning:', this.messageContent());
    // Simulate API call
    setTimeout(() => {
      this.showToast(`Message successfully sent to ${this.selectedMemberForMessage()?.name}`);
      this.closeMessageModal();
    }, 500);
  }

  callMember(member: any) {
    console.log('Calling member', member.mobile);
  }

  generateFine(member: any) {
    console.log('Generating fine for member', member.name);
  }
}
