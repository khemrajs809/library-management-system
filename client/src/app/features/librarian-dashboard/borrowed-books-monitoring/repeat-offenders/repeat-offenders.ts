import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-repeat-offenders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repeat-offenders.html',
  styleUrl: './repeat-offenders.css'
})
export class RepeatOffenders {
  @Input() data: any[] = [];

  get offenders() {
    if (!this.data) return [];
    
    return this.data.map(o => {
      // Basic AI-like risk scoring
      let score = 50;
      score += (o.lateReturns * 10);
      score += (o.avgDelayDays * 2);
      if (score > 99) score = 99;

      let riskLevel = 'Moderate';
      let riskColor = '#fcc419'; // yellow
      let recommendation = 'Send final warning before suspension';

      if (score > 85) {
        riskLevel = 'Critical';
        riskColor = '#e03131'; // red
        recommendation = 'Suspend borrowing privileges immediately';
      } else if (score > 70) {
        riskLevel = 'High';
        riskColor = '#fd7e14'; // orange
        recommendation = 'Reduce max borrow limit to 1';
      }

      return {
        ...o,
        avatar: o.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=random`,
        riskScore: score,
        riskLevel,
        riskColor,
        recommendation
      };
    }).sort((a, b) => b.riskScore - a.riskScore); // Sort by risk
  }

  get riskInsights() {
    if (!this.data || this.data.length === 0) return [];
    const totalOffenders = this.data.length;
    const avgScore = this.offenders.reduce((acc, curr) => acc + curr.riskScore, 0) / totalOffenders;
    const critical = this.offenders.filter(o => o.riskScore > 85).length;
    
    return [
      { title: 'System Risk Level', value: avgScore > 75 ? 'HIGH' : 'MODERATE', desc: 'Based on collective late return patterns', icon: 'fa-exclamation-triangle text-warning' },
      { title: 'Critical Accounts', value: critical, desc: 'Members requiring immediate suspension', icon: 'fa-user-slash text-danger' },
      { title: 'Predicted Loss', value: '12 Books', desc: 'High probability of non-return within 30 days', icon: 'fa-book-dead text-muted' }
    ];
  }

  isMessageModalOpen = signal(false);
  selectedMemberForMessage = signal<any>(null);
  messageContent = signal('');

  warnMember(member: any) {
    this.selectedMemberForMessage.set(member);
    this.messageContent.set(`Dear ${member.name},\n\nWe noticed a pattern of delayed returns on your account. Please be aware that this may lead to suspension of your borrowing privileges.\n\nThank you,\nLibrary Administration`);
    this.isMessageModalOpen.set(true);
  }

  closeMessageModal() {
    this.isMessageModalOpen.set(false);
    this.selectedMemberForMessage.set(null);
  }

  sendMessage() {
    console.log('Sending warning:', this.messageContent());
    // Simulate API call
    setTimeout(() => {
      alert(`Warning successfully sent to ${this.selectedMemberForMessage()?.name}`);
      this.closeMessageModal();
    }, 500);
  }

  sendNotice(member: any) {
    console.log('Generating notice for member', member.name);
    alert(`An official notice has been generated and logged for ${member.name}.`);
  }
}
