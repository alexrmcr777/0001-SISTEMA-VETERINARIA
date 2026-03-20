import { Component, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterModule, CommonModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  auth = inject(AuthService);
  private router = inject(Router);

  profilePhoto = this.auth.profilePhoto;
  menuOpen = signal(false);

  get isVet(): boolean {
    // Touch isLoggedIn signal so this re-evaluates on auth changes
    this.auth.isLoggedIn();
    const session = this.auth.getCurrentUser();
    if (!session) return false;
    return this.auth.getUserById(session.id)?.puestoTrabajo === 'medico_veterinario';
  }

  get userName(): string {
    return this.auth.getCurrentUser()?.nombre ?? '';
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
