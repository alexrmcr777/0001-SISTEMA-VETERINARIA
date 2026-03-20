import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // All routes use Client render mode because the app depends on localStorage/sessionStorage
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
