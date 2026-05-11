import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotesService } from '../../services/notes.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes.html',
  styleUrl: './notes.css'
})
export class NotesComponent {
  private notesService = inject(NotesService);
  private toastService = inject(ToastService);

  isUnlocked = signal(false);
  
  // Content states
  language = signal<'en' | 'hi'>('en');

  englishDetails: Array<{ title: string, desc: string }> = [];
  hinglishDetails: Array<{ title: string, desc: string }> = [];

  // Pattern lock variables
  patternGrid = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  currentPattern = signal<number[]>([]);
  isDrawing = false;

  startPattern(node: number) {
    this.isDrawing = true;
    this.currentPattern.set([node]);
  }

  enterNode(node: number) {
    if (this.isDrawing && !this.currentPattern().includes(node)) {
      this.currentPattern.set([...this.currentPattern(), node]);
    }
  }

  endPattern() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.currentPattern().length > 0) {
      const patternString = this.currentPattern().join('');
      this.notesService.verifyPattern(patternString).subscribe({
        next: (res) => {
          if (res.success) {
            this.isUnlocked.set(true);
            this.loadNotes();
            this.toastService.success('Unlocked successfully');
          }
        },
        error: (err) => {
          this.toastService.error('Invalid pattern');
          this.currentPattern.set([]);
        }
      });
    }
  }

  loadNotes() {
    this.notesService.getNotes().subscribe({
      next: (res) => {
        if (res.success && res.notes) {
          this.englishDetails = res.notes.englishDetails || [];
          this.hinglishDetails = res.notes.hinglishDetails || [];
        }
      },
      error: () => {
        this.toastService.error('Failed to load notes');
      }
    });
  }

  toggleLanguage() {
    this.language.set(this.language() === 'en' ? 'hi' : 'en');
  }

  clearPattern() {
    this.currentPattern.set([]);
  }

  lockNotes() {
    this.isUnlocked.set(false);
  }
}
