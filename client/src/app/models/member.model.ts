export interface Member {
  member_id: string;
  name: string;
  dob: string;
  gender?: 'Male' | 'Female' | 'Other';
  phone?: string;
  email?: string;
  permanent_address?: string;
  current_address?: string;
  // Structured Address Fields
  curr_house?: string;
  curr_street?: string;
  curr_area?: string;
  curr_city?: string;
  curr_state?: string;
  curr_pincode?: string;
  perm_house?: string;
  perm_street?: string;
  perm_area?: string;
  perm_city?: string;
  perm_state?: string;
  perm_pincode?: string;
  course?: string;
  department?: string;
  year_semester?: string;
  membership_type?: 'Student' | 'Faculty' | 'Research Scholar' | 'Other';
  roll_number?: string;
  academic_session?: string;
  hod_name?: string;
  guardian_name?: string;
  guardian_phone?: string;
  blood_group?: string;
  membership_expiry?: string;
  max_book_limit?: number;
  account_status?: 'Active' | 'Suspended' | 'Blacklisted';
  no_dues_status?: number;
  photo_url?: string;
  govt_id_url?: string;
  admission_receipt_url?: string;
  security_deposit_url?: string;
  created_at?: string;
}

export interface MemberStats {
  total_borrowed: number;
  active_issues: number;
  overdue: number;
  total_fines: number;
}

export interface MemberProfile {
  member: Member;
  history: IssueHistoryItem[];
  stats: MemberStats;
}

export interface IssueHistoryItem {
  issue_id: number;
  book_id: string;
  book_title: string;
  isbn: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: 'issued' | 'returned' | 'lost';
  fine_amount: number;
  fine_paid: number;
  created_at?: string;
}
