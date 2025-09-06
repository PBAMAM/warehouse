import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest, from } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/compat/firestore';
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
  showCategoryModal = false;
  editingProduct: Product | null = null;
  selectedItem: InventoryItem | null = null;
  editingCategory: Category | null = null;
  
  // Forms
  productForm!: FormGroup;
  stockForm!: FormGroup;
  categoryForm!: FormGroup;
  
  // Local data
  warehouses: Warehouse[] = [];
  categories: Category[] = [];
  currentUser: User | null = null;

  constructor(
    private inventoryService: InventoryService,
    private warehouseService: WarehouseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private firestore: AngularFirestore
  ) {
    this.initializeForms();
    this.initializeData();
  }

  ngOnInit() {
    this.loadData();
    this.setupFilters();
    
    // Direct subscription to inventory data
    this.inventoryService.getInventory()
      .pipe(takeUntil(this.destroy$))
      .subscribe(inventory => {
        console.log('Direct inventory subscription:', inventory);
        this.filteredInventory = this.applyFilters(inventory);
        this.calculateStats();
        this.calculatePagination();
      });
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
      barcode: [''],
      imageUrl: ['assets/images/default-product.svg'],
      warehouseId: ['', Validators.required]
    });

    this.stockForm = this.fb.group({
      movementType: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      notes: ['']
    });

    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true]
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
        console.log('Current user loaded:', user);
        this.currentUser = user;
      });

    // Inventory loading is now handled in ngOnInit
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
    const canManage = this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
    console.log('Can manage inventory:', canManage, 'User role:', this.currentUser?.role);
    return canManage;
  }

  // Product Management
  openAddProductModal() {
    this.editingProduct = null;
    this.productForm.reset();
    this.showProductModal = true;
  }

  editProduct(item: InventoryItem) {
    console.log('Edit product clicked:', item);
    alert('Edit button clicked!'); // Temporary debug
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
      barcode: item.product.barcode,
      imageUrl: item.product.imageUrl || 'assets/images/default-product.svg',
      warehouseId: item.warehouseId
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
        // Update existing inventory item
        const inventoryItemData = {
          product: {
            ...this.editingProduct,
            ...productData
          }
        };
        
        from(this.inventoryService.updateInventoryItem(this.editingProduct.id!, inventoryItemData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Inventory item updated successfully!');
              this.closeProductModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to update inventory item');
              console.error('Error updating inventory item:', error);
            }
          });
      } else {
        // Create new inventory item
        const inventoryItemData = {
          productId: this.firestore.createId(),
          product: {
            id: this.firestore.createId(),
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          warehouseId: productData.warehouseId,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          minStockLevel: 0,
          maxStockLevel: 100,
          reorderPoint: 10,
          lastUpdated: new Date(),
          location: '',
          batchNumber: '',
          supplierId: '',
          supplierName: '',
          notes: ''
        };
        
        from(this.inventoryService.createInventoryItem(inventoryItemData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Inventory item created successfully!');
              this.closeProductModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to create inventory item');
              console.error('Error creating inventory item:', error);
            }
          });
      }
    }
  }

  deleteProduct(item: InventoryItem) {
    console.log('Delete inventory item clicked:', item);
    alert('Delete button clicked!'); // Temporary debug
    if (confirm('Are you sure you want to delete this inventory item?')) {
      from(this.inventoryService.deleteInventoryItem(item.id!))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Inventory item deleted successfully!');
            // Refresh the inventory data
            this.loadData();
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to delete inventory item');
            console.error('Error deleting inventory item:', error);
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
            // Refresh the inventory data to show updated quantities
            this.loadData();
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

  // Navigation
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToWarehouse(warehouseId: string) {
    this.router.navigate(['/warehouse'], { queryParams: { id: warehouseId } });
  }


  // Category Management
  openCategoryModal() {
    this.showCategoryModal = true;
    this.editingCategory = null;
    this.categoryForm.reset();
    this.categoryForm.patchValue({ isActive: true });
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.editingCategory = null;
    this.categoryForm.reset();
  }

  addCategory() {
    if (this.categoryForm.valid) {
      const categoryData = this.categoryForm.value;
      
      if (this.editingCategory) {
        from(this.inventoryService.updateCategory(this.editingCategory.id!, categoryData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Category updated successfully!');
              this.closeCategoryModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to update category');
              console.error('Error updating category:', error);
            }
          });
      } else {
        from(this.inventoryService.createCategory(categoryData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Category created successfully!');
              this.categoryForm.reset();
              this.categoryForm.patchValue({ isActive: true });
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to create category');
              console.error('Error creating category:', error);
            }
          });
      }
    }
  }

  editCategory(category: Category) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      isActive: category.isActive
    });
  }

  deleteCategory(category: Category) {
    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      from(this.inventoryService.deleteCategory(category.id!))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Category deleted successfully!');
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to delete category');
            console.error('Error deleting category:', error);
          }
        });
    }
  }
}
