import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material (if you want to add it later)
// import { MatButtonModule } from '@angular/material/button';
// import { MatInputModule } from '@angular/material/input';
// import { MatCardModule } from '@angular/material/card';

// Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { SearchBoxComponent } from './components/search-box/search-box.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

// Pipes
import { TimeAgoPipe } from './pipes/time-ago.pipe';
// import { SafeHtmlPipe } from './pipes/safe-html.pipe';
// import { CurrencyPipe } from './pipes/currency.pipe';
// import { TruncatePipe } from './pipes/truncate.pipe';

// Directives - temporarily commented out due to import issues
// import { ClickOutsideDirective } from './directives/click-outside.directive';
// import { DebounceDirective } from './directives/debounce.directive';

const COMPONENTS = [
  LoadingSpinnerComponent,
  NotificationToastComponent,
  ConfirmDialogComponent,
  SearchBoxComponent,
  PaginationComponent,
  SidebarComponent
];

const PIPES: any[] = [
  TimeAgoPipe
];

const DIRECTIVES: any[] = [
  // Temporarily empty due to import issues
];

const VALIDATORS = [
  // Validators are functions, not classes, so they don't need to be in declarations
];

@NgModule({
  declarations: [
    ...COMPONENTS,
    ...PIPES,
    ...DIRECTIVES
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // MatButtonModule,
    // MatInputModule,
    // MatCardModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ...COMPONENTS,
    ...PIPES,
    ...DIRECTIVES
  ]
})
export class SharedModule { }
