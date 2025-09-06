import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { ReportsModule } from './reports/reports.module';
import { WarehouseModule } from './warehouse/warehouse.module';

// Feature modules

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    AuthModule,
    DashboardModule,
    WarehouseModule,
    InventoryModule,
    OrdersModule,
    ReportsModule
  ],
  exports: [
    AuthModule,
    DashboardModule,
    WarehouseModule,
    InventoryModule,
    OrdersModule,
    ReportsModule
  ]
})
export class PagesModule { }
