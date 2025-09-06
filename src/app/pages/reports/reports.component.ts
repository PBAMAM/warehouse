import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { OrderService } from '../../core/services/order.service';
import { InventoryService } from '../../core/services/inventory.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Order } from '../../core/models/order.model';
import { InventoryItem } from '../../core/models/inventory.model';
import { Warehouse } from '../../core/models/warehouse.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Make Math available in template
  Math = Math;
  
  // Data observables
  orders$!: Observable<Order[]>;
  inventory$!: Observable<InventoryItem[]>;
  warehouses$!: Observable<Warehouse[]>;
  user$!: Observable<User | null>;
  
  // Filtered data
  recentOrders: Order[] = [];
  lowStockItems: InventoryItem[] = [];
  topWarehouses: any[] = [];
  
  // Filters
  startDate = new Date();
  endDate = new Date();
  reportType = 'overview';
  timePeriod = 'monthly';
  
  // Stats
  totalRevenue = 0;
  totalOrders = 0;
  totalProducts = 0;
  totalWarehouses = 0;
  revenueChange = 0;
  ordersChange = 0;
  productsChange = 0;
  warehousesChange = 0;
  
  // Performance metrics
  averageOrderValue = 0;
  fulfillmentRate = 0;
  inventoryTurnover = 0;
  customerSatisfaction = 0;
  
  // Chart properties
  revenueChartType: 'line' | 'bar' = 'line';
  
  // Local data
  currentUser: User | null = null;

  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.initializeData();
    this.setupDateRange();
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeData() {
    this.orders$ = this.orderService.getOrders();
    this.inventory$ = this.inventoryService.getInventory();
    this.warehouses$ = this.warehouseService.getWarehouses();
    this.user$ = this.authService.getCurrentUser();
  }

  private setupDateRange() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    this.startDate = lastMonth;
    this.endDate = today;
  }

  private loadData() {
    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load orders
    this.orders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.recentOrders = orders.slice(0, 5);
        this.calculateOrderStats(orders);
      });

    // Load inventory
    this.inventory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(inventory => {
        this.lowStockItems = inventory.filter(item => 
          item.quantity <= item.reorderPoint
        ).slice(0, 5);
        this.calculateInventoryStats(inventory);
      });

    // Load warehouses
    this.warehouses$
      .pipe(takeUntil(this.destroy$))
      .subscribe(warehouses => {
        this.calculateWarehouseStats(warehouses);
        this.topWarehouses = this.calculateTopWarehouses(warehouses);
      });
  }

  private calculateOrderStats(orders: Order[]) {
    this.totalOrders = orders.length;
    this.totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    this.averageOrderValue = this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0;
    
    // Calculate fulfillment rate (orders that reached delivered status)
    const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
    this.fulfillmentRate = this.totalOrders > 0 ? (deliveredOrders / this.totalOrders) * 100 : 0;
    
    // Calculate change from previous period (simplified)
    this.revenueChange = Math.random() * 20 - 10; // Placeholder
    this.ordersChange = Math.random() * 20 - 10; // Placeholder
  }

  private calculateInventoryStats(inventory: InventoryItem[]) {
    this.totalProducts = inventory.length;
    this.productsChange = Math.random() * 20 - 10; // Placeholder
    
    // Calculate inventory turnover (simplified)
    this.inventoryTurnover = Math.random() * 5 + 1; // Placeholder
  }

  private calculateWarehouseStats(warehouses: Warehouse[]) {
    this.totalWarehouses = warehouses.filter(w => w.isActive).length;
    this.warehousesChange = Math.random() * 20 - 10; // Placeholder
  }

  private calculateTopWarehouses(warehouses: Warehouse[]): any[] {
    return warehouses
      .filter(w => w.isActive)
      .map(warehouse => ({
        ...warehouse,
        utilization: this.getUtilizationPercentage(warehouse),
        orderCount: Math.floor(Math.random() * 100) // Placeholder
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 3);
  }

  private getUtilizationPercentage(warehouse: Warehouse): number {
    if (warehouse.capacity === 0) return 0;
    return (warehouse.currentStock / warehouse.capacity) * 100;
  }

  onDateChange() {
    this.loadData();
  }

  onReportTypeChange() {
    this.loadData();
  }

  onTimePeriodChange() {
    this.loadData();
  }

  setRevenueChartType(type: 'line' | 'bar') {
    this.revenueChartType = type;
  }

  generateReport() {
    this.notificationService.showInfo('Report generation functionality coming soon!');
  }

  exportData() {
    this.notificationService.showInfo('Data export functionality coming soon!');
  }

  viewAllOrders() {
    this.notificationService.showInfo('Redirecting to orders page...');
  }

  viewAllInventory() {
    this.notificationService.showInfo('Redirecting to inventory page...');
  }

  getStockStatus(item: InventoryItem): string {
    if (item.quantity === 0) return 'out-of-stock';
    if (item.quantity <= item.reorderPoint) return 'low-stock';
    return 'available';
  }
}