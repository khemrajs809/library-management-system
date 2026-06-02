export interface Member {
  memberId: string;
  name: string;
  dob: string;
  gender?: 'Male' | 'Female' | 'Other';
  phone?: string;
  email?: string;
  permanentAddress?: string;
  currentAddress?: string;
  // Structured Address Fields
  currHouse?: string;
  currStreet?: string;
  currArea?: string;
  currCity?: string;
  currState?: string;
  currPincode?: string;
  permHouse?: string;
  permStreet?: string;
  permArea?: string;
  permCity?: string;
  permState?: string;
  permPincode?: string;
  course?: string;
  department?: string;
  yearSemester?: string;
  membershipType?: 'Student' | 'Faculty' | 'Research Scholar' | 'Other';
  rollNumber?: string;
  academicSession?: string;
  hodName?: string;
  guardianName?: string;
  guardianPhone?: string;
  bloodGroup?: string;
  membershipExpiry?: string;
  maxBookLimit?: number;
  accountStatus?: 'Active' | 'Suspended' | 'Blacklisted';
  noDuesStatus?: number;
  photoUrl?: string;
  govtIdUrl?: string;
  admissionReceiptUrl?: string;
  securityDepositUrl?: string;
  createdAt?: string;
}

export interface MemberStats {
  totalBorrowed: number;
  activeIssues: number;
  overdue: number;
  totalFines: number;
}

export interface MemberProfile {
  member: Member;
  history: IssueHistoryItem[];
  stats: MemberStats;
}

export interface IssueHistoryItem {
  issueId: number;
  bookId: string;
  bookTitle: string;
  isbn: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'lost';
  fineAmount: number;
  finePaid: number;
  createdAt?: string;
}
