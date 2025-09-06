import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    <div class="pagination" *ngIf="totalPages > 1">
      <button 
        class="pagination-btn" 
        [disabled]="currentPage === 1"
        (click)="goToPage(1)"
        title="First Page">
        <i class="fas fa-angle-double-left"></i>
      </button>
      
      <button 
        class="pagination-btn" 
        [disabled]="currentPage === 1"
        (click)="goToPage(currentPage - 1)"
        title="Previous Page">
        <i class="fas fa-angle-left"></i>
      </button>

      <div class="pagination-pages">
        <button 
          *ngFor="let page of getVisiblePages()" 
          class="pagination-btn page-btn"
          [class.active]="page === currentPage"
          [class.disabled]="page === '...'"
          (click)="goToPage(page)"
          [disabled]="page === '...'">
          {{ page }}
        </button>
      </div>

      <button 
        class="pagination-btn" 
        [disabled]="currentPage === totalPages"
        (click)="goToPage(currentPage + 1)"
        title="Next Page">
        <i class="fas fa-angle-right"></i>
      </button>
      
      <button 
        class="pagination-btn" 
        [disabled]="currentPage === totalPages"
        (click)="goToPage(totalPages)"
        title="Last Page">
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  `,
  styles: [`
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .pagination-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid #e9ecef;
      background: white;
      color: #6c757d;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
      font-weight: 500;

      &:hover:not(:disabled) {
        background: #f8f9fa;
        border-color: #3498db;
        color: #3498db;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.active {
        background: #3498db;
        border-color: #3498db;
        color: white;
      }

      &.disabled {
        cursor: default;
        background: transparent;
        border: none;
      }
    }

    .pagination-pages {
      display: flex;
      gap: 0.25rem;
    }

    .page-btn {
      min-width: 40px;
    }

    @media (max-width: 768px) {
      .pagination {
        gap: 0.25rem;
      }

      .pagination-btn {
        width: 36px;
        height: 36px;
        font-size: 0.8rem;
      }

      .page-btn {
        min-width: 36px;
      }
    }
  `]
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() pageSize: number = 20;
  @Input() maxVisiblePages: number = 5;

  @Output() pageChange = new EventEmitter<number>();

  goToPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = this.maxVisiblePages;

    if (total <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Calculate start and end pages
      let start = Math.max(1, current - Math.floor(maxVisible / 2));
      let end = Math.min(total, start + maxVisible - 1);

      // Adjust start if we're near the end
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      // Add first page and ellipsis if needed
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis and last page if needed
      if (end < total) {
        if (end < total - 1) {
          pages.push('...');
        }
        pages.push(total);
      }
    }

    return pages;
  }
}