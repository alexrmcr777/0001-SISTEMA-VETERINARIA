import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const vetGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const session = auth.getCurrentUser();
  if (!session) return router.createUrlTree(['/auth/login']);
  if (session.puestoTrabajo !== 'medico_veterinario') {
    return router.createUrlTree(['/']);
  }
  return true;
};
