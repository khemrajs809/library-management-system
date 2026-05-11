import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  success(text: string) {
    this.show(text, 'success');
  }

  error(text: string) {
    this.show(text, 'error');
  }

  warning(text: string) {
    this.show(text, 'warning');
  }

  info(text: string) {
    this.show(text, 'info');
  }

  private show(text: string, type: 'success' | 'error' | 'warning' | 'info') {
    const id = ++this.toastIdCounter;
    this.toasts.update(t => [...t, { id, type, text }]);
    setTimeout(() => {
      this.toasts.update(t => t.filter(x => x.id !== id));
    }, 5000);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
