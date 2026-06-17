import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverdueMembersTable } from './overdue-members-table/overdue-members-table';
import { AdminService } from '../../../services/admin.service';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-borrowed-books-monitoring',
  imports: [
    CommonModule,
    FormsModule,
    OverdueMembersTable
  ],
  templateUrl: './borrowed-books-monitoring.html',
  styleUrl: './borrowed-books-monitoring.css',
  standalone: true
})
export class BorrowedBooksMonitoring implements OnInit {
  private adminService = inject(AdminService);
  
  activeSection = signal<string>('overdue');
  dashboardData = signal<any>(null);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading.set(true);
    this.adminService.getMonitoringStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.dashboardData.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch monitoring stats:', err);
        this.isLoading.set(false);
      }
    });
  }

  setSection(section: string) {
    this.activeSection.set(section);
  }

  // Section 10: Exports
  exportPDF() {
    console.log('Exporting PDF...');
    const dashboardElement = document.querySelector('.dashboard-content-area') as HTMLElement;
    if (!dashboardElement) return;

    html2canvas(dashboardElement, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`monitoring-report-${new Date().toISOString().split('T')[0]}.pdf`);
    });
  }
  
  exportExcel() {
    console.log('Exporting Excel...');
    const data = this.dashboardData();
    if (!data || !data.overdueMembers) return;

    const overdue = data.overdueMembers;
    let csvContent = "Member Name,Member ID,Email,Mobile,Book Name,ISBN,Borrow Date,Due Date,Days Overdue,Fine Amount,Status\n";
    
    overdue.forEach((member: any) => {
      const row = [
        `"${member.name}"`,
        `"${member.memberId}"`,
        `"${member.email}"`,
        `"${member.mobile}"`,
        `"${member.bookName}"`,
        `"${member.isbn}"`,
        `"${new Date(member.borrowDate).toLocaleDateString()}"`,
        `"${new Date(member.dueDate).toLocaleDateString()}"`,
        member.daysOverdue,
        member.fineAmount,
        `"${member.status}"`
      ].join(',');
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `overdue_members_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  printReport() {
    window.print();
  }
}
