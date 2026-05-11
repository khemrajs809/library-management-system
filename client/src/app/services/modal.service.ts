import { Injectable, signal } from '@angular/core';

export interface ModalMetadata {
  label: string;
  value: any;
  color?: string;
  fullWidth?: boolean;
}

export interface ModalOptions {
  title: string;
  subtitle?: string;
  message: string;
  details?: string;
  metadata?: ModalMetadata[];
  image?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm?: () => void;
  onCancel?: () => void;
}


@Injectable({
  providedIn: 'root'
})
export class ModalService {
  isOpen = signal<boolean>(false);
  options = signal<ModalOptions | null>(null);

  confirm(opts: ModalOptions) {
    this.options.set(opts);
    this.isOpen.set(true);
  }

  show(opts: ModalOptions) {
    this.confirm(opts);
  }

  close(confirmed: boolean = false) {
    const opts = this.options();
    if (confirmed && opts?.onConfirm) {
      opts.onConfirm();
    } else if (!confirmed && opts?.onCancel) {
      opts.onCancel();
    }
    this.isOpen.set(false);
    this.options.set(null);
  }
}
