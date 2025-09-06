import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, combineLatest, from } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { InventoryService } from '../../core/services/inventory.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { InventoryItem, Product, StockMovement, Category } from '../../core/models/inventory.model';
import { Warehouse } from '../../core/models/warehouse.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data observables
  inventory$!: Observable<InventoryItem[]>;
  warehouses$!: Observable<Warehouse[]>;
  categories$!: Observable<Category[]>;
  user$!: Observable<User | null>;
  
  // Filtered data
  filteredInventory: InventoryItem[] = [];
  
  // Filters
  searchTerm = '';
  selectedCategory = '';
  selectedWarehouse = '';
  stockFilter = 'all';
  
  // View mode
  viewMode: 'list' | 'grid' = 'list';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Stats
  totalProducts = 0;
  lowStockCount = 0;
  outOfStockCount = 0;
  totalValue = 0;
  
  // Modals
  showProductModal = false;
  showStockModal = false;
  editingProduct: Product | null = null;
  selectedItem: InventoryItem | null = null;
  
  // Forms
  productForm!: FormGroup;
  stockForm!: FormGroup;
  
  // Local data
  warehouses: Warehouse[] = [];
  categories: Category[] = [];
  currentUser: User | null = null;

  constructor(
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder
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
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      category: ['', Validators.required],
      brand: ['', Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      costPrice: [0, [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      weight: [0, Validators.min(0)],
      description: [''],
      barcode: ['']
    });

    this.stockForm = this.fb.group({
      movementType: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      notes: ['']
    });
  }

  private initializeData() {
    this.inventory$ = this.inventoryService.getInventory();
    this.warehouses$ = this.warehouseService.getWarehouses();
    this.categories$ = this.inventoryService.getCategories();
    this.user$ = this.authService.getCurrentUser();
  }

  private loadData() {
    // Load warehouses
    this.warehouseService.getWarehouses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(warehouses => {
        this.warehouses = warehouses;
      });

    // Load categories
    this.inventoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
      });

    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load inventory with filters
    this.inventory$
      .pipe(
        takeUntil(this.destroy$),
        map(inventory => this.applyFilters(inventory))
      )
      .subscribe(inventory => {
        this.filteredInventory = inventory;
        this.calculateStats();
        this.calculatePagination();
      });
  }

  private setupFilters() {
    // Search debounce
    this.inventory$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
      });
  }

  private applyFilters(inventory: InventoryItem[]): InventoryItem[] {
    let filtered = [...inventory];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.product.name.toLowerCase().includes(term) ||
        item.product.sku.toLowerCase().includes(term) ||
        item.product.brand.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.product.category === this.selectedCategory);
    }

    // Warehouse filter
    if (this.selectedWarehouse) {
      filtered = filtered.filter(item => item.warehouseId === this.selectedWarehouse);
    }

    // Stock filter
    switch (this.stockFilter) {
      case 'low':
        filtered = filtered.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0);
        break;
      case 'out':
        filtered = filtered.filter(item => item.quantity === 0);
        break;
      case 'available':
        filtered = filtered.filter(item => item.quantity > item.reorderPoint);
        break;
    }

    return filtered;
  }

  private calculateStats() {
    this.totalProducts = this.filteredInventory.length;
    this.lowStockCount = this.filteredInventory.filter(item => 
      item.quantity <= item.reorderPoint && item.quantity > 0
    ).length;
    this.outOfStockCount = this.filteredInventory.filter(item => 
      item.quantity === 0
    ).length;
    this.totalValue = this.filteredInventory.reduce((sum, item) => 
      sum + (item.quantity * item.product.unitPrice), 0
    );
  }

  private calculatePagination() {
    this.totalPages = Math.ceil(this.filteredInventory.length / this.pageSize);
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

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Unknown';
  }

  getStockStatus(item: InventoryItem): string {
    if (item.quantity === 0) return 'Out of Stock';
    if (item.quantity <= item.reorderPoint) return 'Low Stock';
    return 'Available';
  }

  canManageInventory(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
  }

  // Product Management
  openAddProductModal() {
    this.editingProduct = null;
    this.productForm.reset();
    this.showProductModal = true;
  }

  editProduct(item: InventoryItem) {
    this.editingProduct = item.product;
    this.productForm.patchValue({
      name: item.product.name,
      sku: item.product.sku,
      category: item.product.category,
      brand: item.product.brand,
      unitPrice: item.product.unitPrice,
      costPrice: item.product.costPrice,
      unit: item.product.unit,
      weight: item.product.weight,
      description: item.product.description,
      barcode: item.product.barcode
    });
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.editingProduct = null;
    this.productForm.reset();
  }

  saveProduct() {
    if (this.productForm.valid) {
      const productData = this.productForm.value;
      
      if (this.editingProduct) {
        from(this.inventoryService.updateProduct(this.editingProduct.id!, productData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Product updated successfully!');
              this.closeProductModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to update product');
              console.error('Error updating product:', error);
            }
          });
      } else {
        from(this.inventoryService.createProduct(productData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Product created successfully!');
              this.closeProductModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to create product');
              console.error('Error creating product:', error);
            }
          });
      }
    }
  }

  deleteProduct(item: InventoryItem) {
    if (confirm('Are you sure you want to delete this product?')) {
      from(this.inventoryService.deleteProduct(item.product.id!))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Product deleted successfully!');
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to delete product');
            console.error('Error deleting product:', error);
          }
        });
    }
  }

  viewProduct(item: InventoryItem) {
    // Implement product details view
    this.notificationService.showInfo('Product details view coming soon!');
  }

  // Stock Management
  openStockAdjustmentModal() {
    this.selectedItem = null;
    this.stockForm.reset();
    this.showStockModal = true;
  }

  adjustStock(item: InventoryItem) {
    this.selectedItem = item;
    this.stockForm.reset();
    this.showStockModal = true;
  }

  closeStockModal() {
    this.showStockModal = false;
    this.selectedItem = null;
    this.stockForm.reset();
  }

  saveStockAdjustment() {
    if (this.stockForm.valid && this.selectedItem) {
      const stockData = this.stockForm.value;
      const movement: Partial<StockMovement> = {
        productId: this.selectedItem.productId,
        warehouseId: this.selectedItem.warehouseId,
        movementType: stockData.movementType,
        quantity: stockData.quantity,
        reason: stockData.reason,
        notes: stockData.notes,
        userId: this.currentUser?.uid || '',
        userName: this.currentUser?.displayName || 'Unknown User'
      };

      this.inventoryService.adjustStock(movement)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Stock adjusted successfully!');
            this.closeStockModal();
          },
          error: (error) => {
            this.notificationService.showError('Failed to adjust stock');
            console.error('Error adjusting stock:', error);
          }
        });
    }
  }

  exportInventory() {
    this.inventoryService.exportInventory(this.filteredInventory)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Inventory exported successfully!');
        },
        error: (error) => {
          this.notificationService.showError('Failed to export inventory');
          console.error('Error exporting inventory:', error);
        }
      });
  }
}
