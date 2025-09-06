import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, from } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OrderService } from '../../core/services/order.service';
import { InventoryService } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Order, OrderItem, OrderStatus, OrderPriority } from '../../core/models/order.model';
import { Product, InventoryItem } from '../../core/models/inventory.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data observables
  orders$!: Observable<Order[]>;
  inventory$!: Observable<InventoryItem[]>;
  user$!: Observable<User | null>;
  
  // Filtered data
  filteredOrders: Order[] = [];
  
  // Filters
  searchTerm = '';
  statusFilter = 'all';
  priorityFilter = 'all';
  dateFilter = 'all';
  
  // View mode
  viewMode: 'list' | 'grid' = 'list';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Stats
  totalOrders = 0;
  pendingOrders = 0;
  shippedOrders = 0;
  totalRevenue = 0;
  
  // Modals
  showOrderModal = false;
  showStatusModal = false;
  editingOrder: Order | null = null;
  selectedOrder: Order | null = null;
  
  // Forms
  orderForm!: FormGroup;
  statusForm!: FormGroup;
  itemForm!: FormGroup;
  
  // Local data
  currentUser: User | null = null;
  products: Product[] = [];
  orderItems: OrderItem[] = [];

  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
    this.initializeData();
  }

  ngOnInit() {
    this.loadData();
    this.setupFilters();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms() {
    this.orderForm = this.fb.group({
      customerName: ['', Validators.required],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerPhone: ['', Validators.required],
      orderNumber: [''],
      shippingStreet: ['', Validators.required],
      shippingCity: ['', Validators.required],
      shippingState: ['', Validators.required],
      shippingZipCode: ['', Validators.required],
      shippingCountry: ['', Validators.required],
      status: ['pending', Validators.required],
      priority: ['normal', Validators.required],
      notes: ['']
    });

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      trackingNumber: [''],
      notes: ['']
    });

    this.itemForm = this.fb.group({
      selectedProduct: ['', Validators.required],
      itemQuantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  private initializeData() {
    this.orders$ = this.orderService.getOrders();
    this.inventory$ = this.inventoryService.getInventory();
    this.user$ = this.authService.getCurrentUser();
  }

  private loadData() {
    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load products from inventory
    this.inventory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(inventory => {
        // Extract unique products from inventory items
        this.products = inventory
          .map(item => item.product)
          .filter((product, index, self) => 
            product && self.findIndex(p => p?.id === product.id) === index
          ) as Product[];
      });

    // Load orders with filters
    this.orders$
      .pipe(
        takeUntil(this.destroy$),
        map(orders => this.applyFilters(orders))
      )
      .subscribe(orders => {
        this.filteredOrders = orders;
        this.calculateStats();
        this.calculatePagination();
      });
  }

  private setupFilters() {
    // Search debounce
    this.orders$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
      });
  }

  private applyFilters(orders: Order[]): Order[] {
    let filtered = [...orders];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === this.statusFilter);
    }

    // Priority filter
    if (this.priorityFilter !== 'all') {
      filtered = filtered.filter(order => order.priority === this.priorityFilter);
    }

    // Date filter
    if (this.dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        switch (this.dateFilter) {
          case 'today':
            return orderDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }

  private calculateStats() {
    this.totalOrders = this.filteredOrders.length;
    this.pendingOrders = this.filteredOrders.filter(o => 
      ['pending', 'confirmed', 'processing'].includes(o.status)
    ).length;
    this.shippedOrders = this.filteredOrders.filter(o => 
      ['shipped', 'delivered'].includes(o.status)
    ).length;
    this.totalRevenue = this.filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  }

  private calculatePagination() {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
  }

  onSearchChange() {
    this.loadData();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  getStatusClass(status: OrderStatus): string {
    return status.toLowerCase();
  }

  getPriorityClass(priority: OrderPriority): string {
    return priority.toLowerCase();
  }

  canManageOrders(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
  }

  canCancelOrder(order: Order): boolean {
    return ['pending', 'confirmed', 'processing'].includes(order.status) && this.canManageOrders();
  }

  // Order Management
  openAddOrderModal() {
    this.editingOrder = null;
    this.orderForm.reset();
    this.orderForm.patchValue({
      status: 'pending',
      priority: 'normal'
    });
    this.orderItems = [];
    this.generateOrderNumber();
    this.showOrderModal = true;
  }

  editOrder(order: Order) {
    this.editingOrder = order;
    this.orderForm.patchValue({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      orderNumber: order.orderNumber,
      shippingStreet: order.shippingAddress.street,
      shippingCity: order.shippingAddress.city,
      shippingState: order.shippingAddress.state,
      shippingZipCode: order.shippingAddress.zipCode,
      shippingCountry: order.shippingAddress.country,
      status: order.status,
      priority: order.priority,
      notes: order.notes
    });
    this.orderItems = [...order.items];
    this.showOrderModal = true;
  }

  closeOrderModal() {
    this.showOrderModal = false;
    this.editingOrder = null;
    this.orderForm.reset();
    this.orderItems = [];
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderForm.patchValue({ orderNumber: `ORD-${timestamp}-${random}` });
  }

  onProductSelect() {
    const selectedProductId = this.itemForm.get('selectedProduct')?.value;
    if (selectedProductId) {
      const product = this.products.find(p => p.id === selectedProductId);
      if (product) {
        this.itemForm.patchValue({ itemQuantity: 1 });
      }
    }
  }

  addItem() {
    console.log('Add item clicked');
    console.log('Item form valid:', this.itemForm.valid);
    console.log('Item form value:', this.itemForm.value);
    
    if (this.itemForm.valid) {
      const selectedProductId = this.itemForm.get('selectedProduct')?.value;
      const itemQuantity = this.itemForm.get('itemQuantity')?.value;
      
      console.log('Selected product ID:', selectedProductId);
      console.log('Item quantity:', itemQuantity);
      
      if (selectedProductId && itemQuantity > 0) {
        const product = this.products.find(p => p.id === selectedProductId);
        if (product) {
          const existingItem = this.orderItems.find(item => item.productId === product.id);
          if (existingItem) {
            existingItem.quantity += itemQuantity;
            existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
          } else {
            const newItem: OrderItem = {
              productId: product.id!,
              product: product,
              quantity: itemQuantity,
              unitPrice: product.unitPrice,
              totalPrice: itemQuantity * product.unitPrice
            };
            this.orderItems.push(newItem);
          }
          this.itemForm.reset();
          this.itemForm.patchValue({ itemQuantity: 1 });
        }
      }
    }
  }

  removeItem(index: number) {
    this.orderItems.splice(index, 1);
  }

  updateItemQuantity(index: number, event: any) {
    const newQuantity = parseInt(event.target.value);
    if (newQuantity > 0) {
      this.orderItems[index].quantity = newQuantity;
      this.orderItems[index].totalPrice = newQuantity * this.orderItems[index].unitPrice;
    }
  }

  updateItemTotal(item: OrderItem) {
    item.totalPrice = item.quantity * item.unitPrice;
  }

  saveOrder() {
    console.log('Save order clicked');
    console.log('Order form valid:', this.orderForm.valid);
    console.log('Order items length:', this.orderItems.length);
    console.log('Order form errors:', this.orderForm.errors);
    console.log('Order form value:', this.orderForm.value);
    
    // Check individual form control validity
    Object.keys(this.orderForm.controls).forEach(key => {
      const control = this.orderForm.get(key);
      console.log(`${key} valid:`, control?.valid, 'errors:', control?.errors);
    });
    
    if (this.orderForm.valid && this.orderItems.length > 0) {
      const orderData = this.orderForm.value;
      const subtotal = this.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.1; // 10% tax
      const shippingAmount = 10; // Fixed shipping
      const totalAmount = subtotal + taxAmount + shippingAmount;

      const order: Partial<Order> = {
        ...orderData,
        customerId: 'temp-customer-id',
        shippingAddress: {
          street: orderData.shippingStreet,
          city: orderData.shippingCity,
          state: orderData.shippingState,
          zipCode: orderData.shippingZipCode,
          country: orderData.shippingCountry
        },
        billingAddress: {
          street: orderData.shippingStreet,
          city: orderData.shippingCity,
          state: orderData.shippingState,
          zipCode: orderData.shippingZipCode,
          country: orderData.shippingCountry
        },
        items: this.orderItems,
        subtotal,
        taxAmount,
        shippingAmount,
        totalAmount,
        discountAmount: 0
      };

      console.log('Order items:', this.orderItems);
      console.log('Order subtotal:', subtotal);
      console.log('Order total amount:', totalAmount);

      if (this.editingOrder) {
        from(this.orderService.updateOrder(this.editingOrder.id!, order))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Order updated successfully!');
              this.closeOrderModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to update order');
              console.error('Error updating order:', error);
            }
          });
      } else {
        console.log('Creating new order with data:', order);
        from(this.orderService.createOrder(order as any))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (orderId) => {
              console.log('Order created successfully with ID:', orderId);
              this.notificationService.showSuccess('Order created successfully!');
              this.closeOrderModal();
            },
            error: (error: any) => {
              console.error('Error creating order:', error);
              this.notificationService.showError('Failed to create order: ' + error.message);
            }
          });
      }
    }
  }

  viewOrder(order: Order) {
    this.notificationService.showInfo('Order details view coming soon!');
  }

  // Status Management
  updateOrderStatus(order: Order) {
    this.selectedOrder = order;
    this.statusForm.reset();
    this.statusForm.patchValue({ status: order.status });
    this.showStatusModal = true;
  }

  closeStatusModal() {
    this.showStatusModal = false;
    this.selectedOrder = null;
    this.statusForm.reset();
  }

  updateStatus() {
    if (this.statusForm.valid && this.selectedOrder) {
      const statusData = this.statusForm.value;
      from(this.orderService.updateOrderStatus(this.selectedOrder.id!, statusData.status, statusData.notes))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Order status updated successfully!');
            this.closeStatusModal();
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update order status');
            console.error('Error updating order status:', error);
          }
        });
    }
  }

  cancelOrder(order: Order) {
    if (confirm('Are you sure you want to cancel this order?')) {
      from(this.orderService.updateOrderStatus(order.id!, 'cancelled'))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Order cancelled successfully!');
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to cancel order');
            console.error('Error cancelling order:', error);
          }
        });
    }
  }

  printOrder(order: Order) {
    this.notificationService.showInfo('Print functionality coming soon!');
  }

  exportOrders() {
    this.orderService.exportOrders(this.filteredOrders)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Orders exported successfully!');
        },
        error: (error) => {
          this.notificationService.showError('Failed to export orders');
          console.error('Error exporting orders:', error);
        }
      });
  }

  // Navigation
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
