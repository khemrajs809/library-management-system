import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Member } from '../../../../../models/member.model';
import { SkeletonLoaderComponent } from '../../../../../shared/animations/skeleton-loader/skeleton-loader.component';
import { FadeInComponent } from '../../../../../shared/animations/fade-in/fade-in.component';

@Component({
  selector: 'app-member-table',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, FadeInComponent],
  templateUrl: './member-table.component.html',
  styleUrl: './member-table.component.css'
})
export class MemberTableComponent {
  @Input() members: Member[] = [];
  @Input() pagination: any = { page: 1, limit: 50, totalPages: 1, total: 0 };
  @Input() isLoading = false;
  @Input() isImporting = false;
  @Input() isScannerActive = false;
  @Input() searchedMemberInfo: Member | null = null;
  @Input() memberSearch = '';
  @Input() uploadsBase = '';

  @Output() onSearch = new EventEmitter<string>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<Member>();
  @Output() onDelete = new EventEmitter<Member>();
  @Output() onView = new EventEmitter<Member>();
  @Output() onDownloadCard = new EventEmitter<Member>();
  @Output() onEmail = new EventEmitter<string | undefined>();
  @Output() onOpenProfile = new EventEmitter<string>();
  @Output() onImport = new EventEmitter<any>();
  @Output() onToggleScanner = new EventEmitter<void>();

  get paginationArray(): number[] {
    const current = this.pagination.page || 1;
    const totalPages = this.pagination.totalPages || 1;
    
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
    return pages;
  }

  isExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    // Set both to midnight for accurate day comparison
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  }

  getEffectiveStatus(member: Member): string {
    if (this.isExpired(member.membershipExpiry)) {
      return 'Suspended';
    }
    return member.accountStatus || 'Active';
  }

  prevPage() {
    if (this.pagination.page > 1) {
      this.onPageChange.emit(this.pagination.page - 1);
    }
  }

  nextPage() {
    if (this.pagination.page < this.pagination.totalPages) {
      this.onPageChange.emit(this.pagination.page + 1);
    }
  }

  goToPage(p: number) {
    this.onPageChange.emit(p);
  }
}
