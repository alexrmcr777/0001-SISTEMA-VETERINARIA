import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" role="alert">
          <span class="toast-icon">
            @if (toast.type === 'success') { ✓ }
            @else if (toast.type === 'error') { ✕ }
            @else if (toast.type === 'warning') { ⚠ }
            @else { ℹ }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Cerrar">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 0.9rem;
      font-weight: 500;
      animation: toast-in 0.25s ease;
      color: #fff;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .toast-success { background: #16a34a; }
    .toast-error   { background: #dc2626; }
    .toast-warning { background: #d97706; }
    .toast-info    { background: #2563eb; }
    .toast-icon { font-size: 1rem; flex-shrink: 0; }
    .toast-msg  { flex: 1; }
    .toast-close {
      background: none; border: none; color: rgba(255,255,255,0.8);
      cursor: pointer; font-size: 1.1rem; padding: 0 4px; line-height: 1;
    }
    .toast-close:hover { color: #fff; }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
