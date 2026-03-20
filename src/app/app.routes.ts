import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { vetGuard } from './guards/vet.guard';
import { loggedInGuard } from './guards/logged-in.guard';

export const routes: Routes = [
    {
        path: 'auth',
        children: [
            { path: 'login',    canActivate: [loggedInGuard], loadComponent: () => import('./features/auth/pages/login/login').then(m => m.Login) },
            { path: 'registro', canActivate: [loggedInGuard], loadComponent: () => import('./features/auth/pages/register/register').then(m => m.Register) },
            { path: '', redirectTo: 'login', pathMatch: 'full' },
        ],
    },
    {
        path: '',
        loadComponent: () => import('./shared/layout/layout').then(m => m.Layout),
        canActivate: [authGuard],
        children: [
            { path: '', loadComponent: () => import('./features/home/pages/home/home').then(m => m.Home) },

            { path: 'mascotas',              loadComponent: () => import('./features/mascotas/pages/mascotas-component/mascotas-component').then(m => m.MascotasComponent) },
            { path: 'mascotas/crear',        loadComponent: () => import('./features/mascotas/pages/crear-mascota/crear-mascota').then(m => m.CrearMascota) },
            { path: 'mascotas/editar/:id',   loadComponent: () => import('./features/mascotas/pages/editar-mascota/editar-mascota').then(m => m.EditarMascota) },
            { path: 'mascotas/historial/:id',loadComponent: () => import('./features/mascotas/pages/ver-historial/ver-historial').then(m => m.VerHistorial) },

            { path: 'duenos',            loadComponent: () => import('./features/duenos/pages/duenos-component/duenos-component').then(m => m.DuenosComponent) },
            { path: 'duenos/crear',      loadComponent: () => import('./features/duenos/pages/crear-dueno/crear-dueno').then(m => m.CrearDueno) },
            { path: 'duenos/editar/:id', loadComponent: () => import('./features/duenos/pages/editar-dueno/editar-dueno').then(m => m.EditarDueno) },

            { path: 'citas',            loadComponent: () => import('./features/citas/pages/citas-component/citas-component').then(m => m.CitasComponent) },
            { path: 'citas/crear',      loadComponent: () => import('./features/citas/pages/crear-cita/crear-cita').then(m => m.CrearCita) },
            { path: 'citas/editar/:id', loadComponent: () => import('./features/citas/pages/editar-cita/editar-cita').then(m => m.EditarCita) },

            { path: 'configuracion', loadComponent: () => import('./features/configuracion/pages/configuracion/configuracion').then(m => m.Configuracion) },

            { path: 'consultas',            loadComponent: () => import('./features/consultas/pages/consultas-component/consultas-component').then(m => m.ConsultasComponent), canActivate: [vetGuard] },
            { path: 'consultas/crear',      loadComponent: () => import('./features/consultas/pages/crear-consulta/crear-consulta').then(m => m.CrearConsulta), canActivate: [vetGuard] },
            { path: 'consultas/editar/:id', loadComponent: () => import('./features/consultas/pages/editar-consulta/editar-consulta').then(m => m.EditarConsulta), canActivate: [vetGuard] },

            { path: 'reportes', loadComponent: () => import('./features/reportes/pages/reportes/reportes').then(m => m.Reportes), canActivate: [vetGuard] },
        ],
    },
    { path: '**', redirectTo: 'auth/login' },
];

