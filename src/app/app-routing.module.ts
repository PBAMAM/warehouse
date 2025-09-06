import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'auth', 
    loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthModule) 
  },
  { path: 'login', redirectTo: '/auth/login' },
  { path: 'register', redirectTo: '/auth/register' },
  { path: 'forgot-password', redirectTo: '/auth/forgot-password' },
  { 
    path: 'dashboard', 
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'warehouse', 
    loadChildren: () => import('./pages/warehouse/warehouse.module').then(m => m.WarehouseModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'inventory', 
    loadChildren: () => import('./pages/inventory/inventory.module').then(m => m.InventoryModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'orders', 
    loadChildren: () => import('./pages/orders/orders.module').then(m => m.OrdersModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'reports', 
    loadChildren: () => import('./pages/reports/reports.module').then(m => m.ReportsModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'notifications', 
    loadChildren: () => import('./pages/notifications/notifications.module').then(m => m.NotificationsModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
