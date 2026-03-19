import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isOpen = false;
  auth = inject(AuthService);
  private router = inject(Router);

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  get userName(): string {
    return this.auth.getCurrentUser()?.nombre ?? '';
  }

  get isVet(): boolean {
    return this.auth.getCurrentUser()?.puestoTrabajo === 'medico_veterinario';
  }
}
