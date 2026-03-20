import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);

  // Check JWT expiry without verifying signature (signature is validated server-side)
  const session = auth.getCurrentUser() as any;
  const token: string | undefined = session?.token;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        auth.logout();
        return router.createUrlTree(['/auth/login']);
      }
    } catch {
      // Malformed token — treat as expired
      auth.logout();
      return router.createUrlTree(['/auth/login']);
    }
  }
  return true;
};
