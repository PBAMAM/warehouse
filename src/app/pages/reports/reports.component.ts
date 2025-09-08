import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';
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
export class ReportsComponent implements OnInit, OnDestroy, AfterViewInit {
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
  allOrders: Order[] = [];
  allInventory: InventoryItem[] = [];
  allWarehouses: Warehouse[] = [];
  
  // Filters
  startDate: string = '';
  endDate: string = '';
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
  
  // Loading states
  isLoading = false;
  hasError = false;
  errorMessage = '';
  
  // Chart data
  revenueChartData: any[] = [];
  orderStatusData: any[] = [];
  topProductsData: any[] = [];
  warehouseUtilizationData: any[] = [];

  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.initializeData();
    this.setupDateRange();
  }

  ngOnInit() {
    // Clear any existing stock adjustment notifications to prevent spam
    this.notificationService.clearStockAdjustmentNotifications();
    this.loadData();
  }

  ngAfterViewInit() {
    // Initialize charts after view is ready
    setTimeout(() => {
      this.initializeCharts();
    }, 1000);
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
    this.startDate = this.formatDateForInput(lastMonth);
    this.endDate = this.formatDateForInput(today);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadData() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load all data using combineLatest for better error handling
    combineLatest([
      this.orders$.pipe(catchError(error => {
        console.error('Error loading orders:', error);
        this.notificationService.showError('Failed to load orders data');
        return [];
      })),
      this.inventory$.pipe(catchError(error => {
        console.error('Error loading inventory:', error);
        this.notificationService.showError('Failed to load inventory data');
        return [];
      })),
      this.warehouses$.pipe(catchError(error => {
        console.error('Error loading warehouses:', error);
        this.notificationService.showError('Failed to load warehouse data');
        return [];
      }))
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(([orders, inventory, warehouses]) => {
      this.allOrders = orders;
      this.allInventory = inventory;
      this.allWarehouses = warehouses;
      
      this.processData();
      this.isLoading = false;
    });
  }

  private processData() {
    // Process orders
    this.recentOrders = this.allOrders.slice(0, 5);
    this.calculateOrderStats(this.allOrders);
    this.generateOrderStatusData();
    this.generateRevenueChartData();

    // Process inventory
    this.lowStockItems = this.allInventory.filter(item => 
      item.quantity <= item.reorderPoint
    ).slice(0, 5);
    this.calculateInventoryStats(this.allInventory);
    this.generateTopProductsData();

    // Process warehouses
    this.calculateWarehouseStats(this.allWarehouses);
    this.topWarehouses = this.calculateTopWarehouses(this.allWarehouses);
    this.generateWarehouseUtilizationData();
  }

  private calculateOrderStats(orders: Order[]) {
    this.totalOrders = orders.length;
    this.totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    this.averageOrderValue = this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0;
    
    // Calculate fulfillment rate (orders that reached delivered status)
    const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
    this.fulfillmentRate = this.totalOrders > 0 ? (deliveredOrders / this.totalOrders) * 100 : 0;
    
    // Calculate change from previous period (simplified - in real app, compare with previous period)
    this.revenueChange = this.calculatePercentageChange(this.totalRevenue, this.totalRevenue * 0.8);
    this.ordersChange = this.calculatePercentageChange(this.totalOrders, this.totalOrders * 0.9);
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private calculateInventoryStats(inventory: InventoryItem[]) {
    this.totalProducts = inventory.length;
    this.productsChange = this.calculatePercentageChange(this.totalProducts, this.totalProducts * 0.95);
    
    // Calculate inventory turnover (simplified)
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.product.unitPrice), 0);
    this.inventoryTurnover = totalValue > 0 ? this.totalRevenue / totalValue : 0;
  }

  private calculateWarehouseStats(warehouses: Warehouse[]) {
    this.totalWarehouses = warehouses.filter(w => w.isActive).length;
    this.warehousesChange = this.calculatePercentageChange(this.totalWarehouses, this.totalWarehouses * 0.9);
  }

  private calculateTopWarehouses(warehouses: Warehouse[]): any[] {
    return warehouses
      .filter(w => w.isActive)
      .map(warehouse => ({
        ...warehouse,
        utilization: this.getUtilizationPercentage(warehouse),
        orderCount: this.getOrderCountForWarehouse(warehouse.id || '')
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 3);
  }

  private getOrderCountForWarehouse(warehouseId: string): number {
    // Count orders that might be associated with this warehouse
    // This is a simplified calculation - in real app, you'd have warehouse-order relationships
    return this.allOrders.filter(order => 
      order.shippingAddress?.city?.toLowerCase().includes('warehouse') ||
      Math.random() > 0.7 // Random distribution for demo
    ).length;
  }

  private getUtilizationPercentage(warehouse: Warehouse): number {
    if (warehouse.capacity === 0) return 0;
    return (warehouse.currentStock / warehouse.capacity) * 100;
  }

  // Chart data generation methods
  private generateRevenueChartData() {
    // Generate revenue data for the last 7 days
    const days = 7;
    this.revenueChartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = this.allOrders.filter(order => 
        new Date(order.createdAt).toDateString() === date.toDateString()
      );
      const dailyRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      this.revenueChartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dailyRevenue
      });
    }
  }

  private generateOrderStatusData() {
    const statusCounts = this.allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.orderStatusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: count,
      percentage: (count / this.allOrders.length) * 100
    }));
  }

  private generateTopProductsData() {
    // Get top products by quantity sold (simplified)
    const productSales = this.allInventory.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      value: item.quantity * item.product.unitPrice
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    this.topProductsData = productSales;
  }

  private generateWarehouseUtilizationData() {
    this.warehouseUtilizationData = this.allWarehouses
      .filter(w => w.isActive)
      .map(warehouse => ({
        name: warehouse.name,
        utilization: this.getUtilizationPercentage(warehouse),
        capacity: warehouse.capacity,
        currentStock: warehouse.currentStock
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }

  private initializeCharts() {
    // Simple chart implementation using HTML5 Canvas
    this.drawRevenueChart();
    this.drawOrderStatusChart();
    this.drawTopProductsChart();
    this.drawWarehouseUtilizationChart();
  }

  private drawRevenueChart() {
    const canvas = document.querySelector('#revenueChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = this.revenueChartData;
    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No revenue data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw bars
    const barWidth = chartWidth / data.length;
    data.forEach((item, index) => {
      const barHeight = (item.revenue / maxRevenue) * chartHeight;
      const x = padding + index * barWidth;
      const y = canvas.height - padding - barHeight;

      ctx.fillStyle = '#667eea';
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Draw value on top
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.revenue.toFixed(0)}`, x + barWidth / 2, y - 5);
    });
  }

  private drawOrderStatusChart() {
    const canvas = document.querySelector('#orderStatusChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = this.orderStatusData;
    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No order data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    let currentAngle = 0;
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

    data.forEach((item, index) => {
      const sliceAngle = (item.count / this.allOrders.length) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.status}: ${item.count}`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }

  private drawTopProductsChart() {
    const canvas = document.querySelector('#topProductsChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = this.topProductsData;
    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No product data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw horizontal bars
    const barHeight = chartHeight / data.length;
    data.forEach((item, index) => {
      const barWidth = (item.value / maxValue) * chartWidth;
      const x = padding;
      const y = padding + index * barHeight;

      ctx.fillStyle = '#667eea';
      ctx.fillRect(x, y, barWidth, barHeight - 2);

      // Draw label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, x + 5, y + barHeight / 2 + 4);
    });
  }

  private drawWarehouseUtilizationChart() {
    const canvas = document.querySelector('#warehouseUtilizationChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = this.warehouseUtilizationData;
    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No warehouse data available', canvas.width / 2, canvas.height / 2);
      return;
    }

    const maxUtilization = Math.max(...data.map(d => d.utilization));
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    // Draw bars
    const barWidth = chartWidth / data.length;
    data.forEach((item, index) => {
      const barHeight = (item.utilization / 100) * chartHeight;
      const x = padding + index * barWidth;
      const y = canvas.height - padding - barHeight;

      ctx.fillStyle = item.utilization > 80 ? '#f5576c' : item.utilization > 60 ? '#f093fb' : '#667eea';
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Draw value on top
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.utilization.toFixed(1)}%`, x + barWidth / 2, y - 5);
    });
  }

  onDateChange() {
    this.loadData();
  }

  onReportTypeChange() {
    this.processData();
    this.initializeCharts();
  }

  onTimePeriodChange() {
    this.processData();
    this.initializeCharts();
  }

  setRevenueChartType(type: 'line' | 'bar') {
    this.revenueChartType = type;
    this.drawRevenueChart();
  }

  generateReport() {
    this.isLoading = true;
    
    // Simulate report generation
    setTimeout(() => {
      const reportData = {
        generatedAt: new Date().toISOString(),
        reportType: this.reportType,
        timePeriod: this.timePeriod,
        dateRange: {
          start: this.startDate,
          end: this.endDate
        },
        metrics: {
          totalRevenue: this.totalRevenue,
          totalOrders: this.totalOrders,
          totalProducts: this.totalProducts,
          totalWarehouses: this.totalWarehouses,
          averageOrderValue: this.averageOrderValue,
          fulfillmentRate: this.fulfillmentRate,
          inventoryTurnover: this.inventoryTurnover
        },
        data: {
          orders: this.allOrders,
          inventory: this.allInventory,
          warehouses: this.allWarehouses
        }
      };

      // Create and download report
      const reportJson = JSON.stringify(reportData, null, 2);
      const blob = new Blob([reportJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `warehouse-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.isLoading = false;
      this.notificationService.showSuccess('Report generated and downloaded successfully!');
    }, 2000);
  }

  exportData() {
    this.isLoading = true;
    
    // Export data based on report type
    let exportData: any[] = [];
    let filename = '';
    
    switch (this.reportType) {
      case 'orders':
        exportData = this.allOrders;
        filename = 'orders-export';
        break;
      case 'inventory':
        exportData = this.allInventory;
        filename = 'inventory-export';
        break;
      case 'warehouse':
        exportData = this.allWarehouses;
        filename = 'warehouses-export';
        break;
      default:
        exportData = [
          {
            type: 'complete-data-export',
            orders: this.allOrders,
            inventory: this.allInventory,
            warehouses: this.allWarehouses,
            metrics: {
              totalRevenue: this.totalRevenue,
              totalOrders: this.totalOrders,
              totalProducts: this.totalProducts,
              totalWarehouses: this.totalWarehouses
            }
          }
        ];
        filename = 'complete-data-export';
    }

    // Create CSV or JSON based on data type
    if (Array.isArray(exportData)) {
      this.exportToCSV(exportData, filename);
    } else {
      this.exportToJSON(exportData, filename);
    }

    this.isLoading = false;
    this.notificationService.showSuccess('Data exported successfully!');
  }

  private exportToCSV(data: any[], filename: string) {
    if (data.length === 0) {
      this.notificationService.showWarning('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private exportToJSON(data: any, filename: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  viewAllOrders() {
    this.router.navigate(['/orders']);
  }

  viewAllInventory() {
    this.router.navigate(['/inventory']);
  }

  getStockStatus(item: InventoryItem): string {
    if (item.quantity === 0) return 'out-of-stock';
    if (item.quantity <= item.reorderPoint) return 'low-stock';
    return 'available';
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notificationService.clearAllNotifications();
    this.notificationService.showSuccess('All notifications cleared successfully!');
  }

  // Clear only stock notifications
  clearStockNotifications() {
    this.notificationService.clearStockAdjustmentNotifications();
    this.notificationService.showSuccess('Stock notifications cleared successfully!');
  }

  // Navigation
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}