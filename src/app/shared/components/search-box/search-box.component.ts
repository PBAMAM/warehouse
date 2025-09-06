import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-box',
  template: `
    <div class="search-box">
      <div class="search-input-container">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          [placeholder]="placeholder"
          [value]="searchTerm"
          (input)="onSearch($event)"
          class="search-input"
        />
        <button
          *ngIf="searchTerm"
          type="button"
          class="clear-button"
          (click)="clearSearch()"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-box {
      width: 100%;
      max-width: 400px;
    }

    .search-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: #999;
      z-index: 1;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    .search-input:focus {
      outline: none;
      border-color: #007bff;
      background: white;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .clear-button {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .clear-button:hover {
      color: #666;
      background: #f0f0f0;
    }
  `]
})
export class SearchBoxComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Search...';
  @Input() debounceTime: number = 300;
  @Output() search = new EventEmitter<string>();

  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject
      .pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.search.emit(searchTerm);
      });
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.search.emit('');
  }
}
