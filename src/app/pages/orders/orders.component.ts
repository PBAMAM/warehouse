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
  showViewModal = false;
  showPrintModal = false;
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
    this.selectedOrder = order;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedOrder = null;
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
    this.selectedOrder = order;
    this.showPrintModal = true;
  }

  closePrintModal() {
    this.showPrintModal = false;
    this.selectedOrder = null;
  }

  generateInvoice() {
    if (!this.selectedOrder) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.notificationService.showError('Unable to open print window. Please check your popup blocker.');
      return;
    }

    // Generate invoice HTML
    const invoiceHTML = this.generateInvoiceHTML(this.selectedOrder);
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };

    this.closePrintModal();
    this.notificationService.showSuccess('Invoice generated successfully!');
  }

  private generateInvoiceHTML(order: Order): string {
    const currentDate = new Date().toLocaleDateString();
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    
    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          ${this.getPrintStyles()}
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Invoice Header -->
          <div class="invoice-header">
            <div class="company-info">
              <h1>WAREHOUSE MANAGEMENT SYSTEM</h1>
              <p>123 Business Street, City, State 12345</p>
              <p>Phone: (555) 123-4567 | Email: info@warehouse.com</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <div class="invoice-details">
                <p><strong>Invoice #:</strong> ${order.orderNumber}</p>
                <p><strong>Date:</strong> ${orderDate}</p>
                <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
                <p><strong>Priority:</strong> ${order.priority.toUpperCase()}</p>
                ${order.trackingNumber ? `<p><strong>Tracking #:</strong> ${order.trackingNumber}</p>` : ''}
              </div>
            </div>
          </div>

          <!-- Customer Information -->
          <div class="customer-section">
            <h3>Bill To:</h3>
            <div class="customer-info">
              <p><strong>${order.customerName}</strong></p>
              <p>${order.customerEmail}</p>
              <p>${order.customerPhone}</p>
            </div>
          </div>

          <!-- Shipping Address -->
          <div class="shipping-section">
            <h3>Ship To:</h3>
            <div class="shipping-info">
              <p>${order.shippingAddress.street}</p>
              <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
              <p>${order.shippingAddress.country}</p>
            </div>
          </div>

          <!-- Order Items -->
          <div class="items-section">
            <h3>Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-details">
                        <strong>${item.product.name}</strong>
                        ${item.product.brand ? `<br><small>Brand: ${item.product.brand}</small>` : ''}
                      </div>
                    </td>
                    <td>${item.product.sku}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Order Summary -->
          <div class="summary-section">
            <div class="summary-details">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(order.subtotal)}</span>
              </div>
              ${order.taxAmount > 0 ? `
                <div class="summary-row">
                  <span>Tax (10%):</span>
                  <span>${formatCurrency(order.taxAmount)}</span>
                </div>
              ` : ''}
              ${order.shippingAmount > 0 ? `
                <div class="summary-row">
                  <span>Shipping:</span>
                  <span>${formatCurrency(order.shippingAmount)}</span>
                </div>
              ` : ''}
              ${order.discountAmount > 0 ? `
                <div class="summary-row">
                  <span>Discount:</span>
                  <span>-${formatCurrency(order.discountAmount)}</span>
                </div>
              ` : ''}
              <div class="summary-row total">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${formatCurrency(order.totalAmount)}</strong></span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${order.notes ? `
            <div class="notes-section">
              <h3>Notes</h3>
              <p>${order.notes}</p>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="invoice-footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${currentDate}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPrintStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        background: white;
      }

      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: white;
      }

      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #333;
      }

      .company-info h1 {
        font-size: 24px;
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .company-info p {
        margin-bottom: 5px;
        color: #666;
      }

      .invoice-info h2 {
        font-size: 28px;
        color: #2c3e50;
        margin-bottom: 15px;
        text-align: right;
      }

      .invoice-details p {
        margin-bottom: 5px;
        text-align: right;
      }

      .customer-section, .shipping-section {
        margin-bottom: 25px;
        display: inline-block;
        width: 48%;
        vertical-align: top;
      }

      .shipping-section {
        margin-left: 4%;
      }

      .customer-section h3, .shipping-section h3 {
        font-size: 16px;
        color: #2c3e50;
        margin-bottom: 10px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }

      .customer-info p, .shipping-info p {
        margin-bottom: 3px;
      }

      .items-section {
        margin-bottom: 25px;
      }

      .items-section h3 {
        font-size: 16px;
        color: #2c3e50;
        margin-bottom: 15px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .items-table th,
      .items-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .items-table th {
        background-color: #f8f9fa;
        font-weight: bold;
        color: #2c3e50;
      }

      .items-table td {
        vertical-align: top;
      }

      .item-details strong {
        display: block;
        margin-bottom: 3px;
      }

      .item-details small {
        color: #666;
      }

      .summary-section {
        margin-bottom: 25px;
      }

      .summary-details {
        float: right;
        width: 300px;
        border: 1px solid #ddd;
        padding: 15px;
        background-color: #f8f9fa;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 3px 0;
      }

      .summary-row.total {
        border-top: 2px solid #333;
        margin-top: 10px;
        padding-top: 10px;
        font-size: 14px;
      }

      .notes-section {
        margin-bottom: 25px;
        clear: both;
      }

      .notes-section h3 {
        font-size: 16px;
        color: #2c3e50;
        margin-bottom: 10px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }

      .notes-section p {
        padding: 10px;
        background-color: #f8f9fa;
        border-left: 4px solid #3498db;
        border-radius: 4px;
      }

      .invoice-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        color: #666;
      }

      .invoice-footer p {
        margin-bottom: 5px;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .invoice-container {
          margin: 0;
          padding: 0;
        }
        
        .summary-details {
          page-break-inside: avoid;
        }
      }
    `;
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
