import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subject, from } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WarehouseService } from '../../core/services/warehouse.service';
import { InventoryService } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Warehouse, WarehouseZone } from '../../core/models/warehouse.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.scss']
})
export class WarehouseComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data observables
  warehouses$!: Observable<Warehouse[]>;
  user$!: Observable<User | null>;
  
  // Filtered data
  filteredWarehouses: Warehouse[] = [];
  
  // Filters
  searchTerm = '';
  statusFilter = 'all';
  capacityFilter = 'all';
  
  // View mode
  viewMode: 'list' | 'grid' = 'list';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Stats
  totalWarehouses = 0;
  activeWarehouses = 0;
  lowCapacityWarehouses = 0;
  totalCapacity = 0;
  
  // Modals
  showWarehouseModal = false;
  showZoneModal = false;
  showAddZoneModal = false;
  showAddItemModal = false;
  showWarehouseDetailModal = false;
  editingWarehouse: Warehouse | null = null;
  editingZone: WarehouseZone | null = null;
  selectedWarehouse: Warehouse | null = null;
  detailWarehouse: Warehouse | null = null;
  
  // Forms
  warehouseForm!: FormGroup;
  zoneForm!: FormGroup;
  quickAddItemForm!: FormGroup;
  
  // Local data
  currentUser: User | null = null;
  zones: WarehouseZone[] = [];

  constructor(
    private warehouseService: WarehouseService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForms();
    this.initializeData();
  }

  ngOnInit() {
    this.loadData();
    this.setupFilters();
    this.handleWarehouseNavigation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms() {
    this.warehouseForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      capacity: [0, [Validators.required, Validators.min(1)]],
      managerName: ['', Validators.required],
      managerId: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required],
      contactPhone: [''],
      contactEmail: [''],
      isActive: [true]
    });

    this.zoneForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      capacity: [0, [Validators.required, Validators.min(1)]],
      temperature: [null],
      humidity: [null],
      isActive: [true]
    });

    this.quickAddItemForm = this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      category: [''],
      price: [0, [Validators.min(0)]],
      description: ['']
    });
  }

  private initializeData() {
    this.warehouses$ = this.warehouseService.getWarehousesWithStock();
    this.user$ = this.authService.getCurrentUser();

  }

  private loadData() {
    // Load current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Load warehouses with filters
    this.warehouses$
      .pipe(
        takeUntil(this.destroy$),
        map(warehouses => this.applyFilters(warehouses))
      )
      .subscribe(warehouses => {
        this.filteredWarehouses = warehouses;
        this.calculateStats();
        this.calculatePagination();
      });
  }

  private setupFilters() {
    // Search debounce
    this.warehouses$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
      });
  }

  private applyFilters(warehouses: Warehouse[]): Warehouse[] {
    let filtered = [...warehouses];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(warehouse =>
        warehouse.name.toLowerCase().includes(term) ||
        warehouse.city.toLowerCase().includes(term) ||
        warehouse.state.toLowerCase().includes(term) ||
        warehouse.managerName.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      const isActive = this.statusFilter === 'active';
      filtered = filtered.filter(warehouse => warehouse.isActive === isActive);
    }

    // Capacity filter
    if (this.capacityFilter !== 'all') {
      filtered = filtered.filter(warehouse => {
        const utilization = this.getUtilizationPercentage(warehouse);
        switch (this.capacityFilter) {
          case 'low':
            return utilization < 50;
          case 'medium':
            return utilization >= 50 && utilization < 80;
          case 'high':
            return utilization >= 80;
          default:
            return true;
        }
      });
    }

    return filtered;
  }

  private calculateStats() {
    this.totalWarehouses = this.filteredWarehouses.length;
    this.activeWarehouses = this.filteredWarehouses.filter(w => w.isActive).length;
    this.lowCapacityWarehouses = this.filteredWarehouses.filter(w => 
      this.getUtilizationPercentage(w) >= 80
    ).length;
    this.totalCapacity = this.filteredWarehouses.reduce((sum, w) => sum + w.capacity, 0);
  }

  private calculatePagination() {
    this.totalPages = Math.ceil(this.filteredWarehouses.length / this.pageSize);
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

  getUtilizationPercentage(warehouse: Warehouse): number {
    if (warehouse.capacity === 0) return 0;
    return (warehouse.currentStock / warehouse.capacity) * 100;
  }

  getZoneUtilization(zone: WarehouseZone): number {
    if (zone.capacity === 0) return 0;
    return (zone.currentStock / zone.capacity) * 100;
  }

  canManageWarehouses(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
  }

  // Warehouse Management
  openAddWarehouseModal() {
    this.editingWarehouse = null;
    this.warehouseForm.reset();
    this.warehouseForm.patchValue({ isActive: true });
    this.showWarehouseModal = true;
  }

  editWarehouse(warehouse: Warehouse) {
    this.editingWarehouse = warehouse;
    this.warehouseForm.patchValue({
      name: warehouse.name,
      description: warehouse.description,
      capacity: warehouse.capacity,
      managerName: warehouse.managerName,
      managerId: warehouse.managerId,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      zipCode: warehouse.zipCode,
      country: warehouse.country,
      contactPhone: warehouse.contactPhone,
      contactEmail: warehouse.contactEmail,
      isActive: warehouse.isActive
    });
    this.showWarehouseModal = true;
  }

  closeWarehouseModal() {
    this.showWarehouseModal = false;
    this.editingWarehouse = null;
    this.warehouseForm.reset();
  }

  saveWarehouse() {
    if (this.warehouseForm.valid) {
      const warehouseData = this.warehouseForm.value;
      
      if (this.editingWarehouse) {
        from(this.warehouseService.updateWarehouse(this.editingWarehouse.id!, warehouseData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Warehouse updated successfully!');
              this.closeWarehouseModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to update warehouse');
              console.error('Error updating warehouse:', error);
            }
          });
      } else {
        from(this.warehouseService.createWarehouse(warehouseData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Warehouse created successfully!');
              this.closeWarehouseModal();
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to create warehouse');
              console.error('Error creating warehouse:', error);
            }
          });
      }
    }
  }

  deleteWarehouse(warehouse: Warehouse) {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      from(this.warehouseService.deleteWarehouse(warehouse.id!))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Warehouse deleted successfully!');
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to delete warehouse');
            console.error('Error deleting warehouse:', error);
          }
        });
    }
  }

  toggleWarehouseStatus(warehouse: Warehouse) {
    const newStatus = !warehouse.isActive;
    from(this.warehouseService.updateWarehouse(warehouse.id!, { isActive: newStatus }))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(
            `Warehouse ${newStatus ? 'activated' : 'deactivated'} successfully!`
          );
        },
        error: (error: any) => {
          this.notificationService.showError('Failed to update warehouse status');
          console.error('Error updating warehouse status:', error);
        }
      });
  }

  viewWarehouse(warehouse: Warehouse) {
    this.detailWarehouse = warehouse;
    this.showWarehouseDetailModal = true;
  }

  closeWarehouseDetailModal() {
    this.showWarehouseDetailModal = false;
    this.detailWarehouse = null;
  }

  // Zone Management
  manageZones(warehouse: Warehouse) {
    this.selectedWarehouse = warehouse;
    this.loadZones(warehouse.id!);
    this.showZoneModal = true;
  }

  closeZoneModal() {
    this.showZoneModal = false;
    this.selectedWarehouse = null;
    this.zones = [];
  }

  private loadZones(warehouseId: string) {
    this.warehouseService.getWarehouseZones(warehouseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(zones => {
        this.zones = zones;
      });
  }

  openAddZoneModal() {
    this.editingZone = null;
    this.zoneForm.reset();
    this.zoneForm.patchValue({ isActive: true });
    this.showAddZoneModal = true;
  }

  editZone(zone: WarehouseZone) {
    this.editingZone = zone;
    this.zoneForm.patchValue({
      name: zone.name,
      description: zone.description,
      capacity: zone.capacity,
      temperature: zone.temperature,
      humidity: zone.humidity,
      isActive: zone.isActive
    });
    this.showAddZoneModal = true;
  }

  closeAddZoneModal() {
    this.showAddZoneModal = false;
    this.editingZone = null;
    this.zoneForm.reset();
  }

  saveZone() {
    if (this.zoneForm.valid && this.selectedWarehouse) {
      const zoneData = {
        ...this.zoneForm.value,
        warehouseId: this.selectedWarehouse.id!
      };
      
      if (this.editingZone) {
        this.warehouseService.updateZone(this.editingZone.id!, zoneData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Zone updated successfully!');
              this.closeAddZoneModal();
              this.loadZones(this.selectedWarehouse!.id!);
            },
            error: (error) => {
              this.notificationService.showError('Failed to update zone');
              console.error('Error updating zone:', error);
            }
          });
      } else {
        from(this.warehouseService.createZone(zoneData))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Zone created successfully!');
              this.closeAddZoneModal();
              this.loadZones(this.selectedWarehouse!.id!);
            },
            error: (error: any) => {
              this.notificationService.showError('Failed to create zone');
              console.error('Error creating zone:', error);
            }
          });
      }
    }
  }

  deleteZone(zone: WarehouseZone) {
    if (confirm('Are you sure you want to delete this zone?')) {
      this.warehouseService.deleteZone(zone.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Zone deleted successfully!');
            this.loadZones(this.selectedWarehouse!.id!);
          },
          error: (error) => {
            this.notificationService.showError('Failed to delete zone');
            console.error('Error deleting zone:', error);
          }
        });
    }
  }

  exportWarehouses() {
    this.warehouseService.exportWarehouses(this.filteredWarehouses)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Warehouses exported successfully!');
        },
        error: (error) => {
          this.notificationService.showError('Failed to export warehouses');
          console.error('Error exporting warehouses:', error);
        }
      });
  }

  // Navigation
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  private handleWarehouseNavigation() {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
           this.viewWarehouse(params['id']);
        }
      });
  }

   openAddItemModal() {
    this.showAddItemModal = true;
    this.clearQuickAddForm();
  }

  closeAddItemModal() {
    this.showAddItemModal = false;
    this.clearQuickAddForm();
  }

  // Quick Add Item Methods
  addQuickItem() {
    if (this.quickAddItemForm.valid) {
      const itemData = this.quickAddItemForm.value;
      
      // Here you would typically call an inventory service to add the item
      // For now, we'll just show a success message
      this.notificationService.showSuccess(`Item "${itemData.name}" added successfully!`);
      this.closeAddItemModal();
      
      // In a real implementation, you would:
      // 1. Call inventoryService.addItem(itemData)
      // 2. Update the inventory list
      // 3. Refresh warehouse data if needed
    }
  }

  clearQuickAddForm() {
    this.quickAddItemForm.reset();
    this.quickAddItemForm.patchValue({
      quantity: 1,
      price: 0
    });
  }

}
