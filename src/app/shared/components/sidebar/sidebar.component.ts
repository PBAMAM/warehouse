import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  user$: Observable<User | null>;
  currentRoute = '';
  isCollapsed = false;

  navigationItems = [
    {
      label: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      route: '/dashboard',
      active: false
    },
    {
      label: 'Warehouses',
      icon: 'fas fa-warehouse',
      route: '/warehouse',
      active: false
    },
    {
      label: 'Inventory',
      icon: 'fas fa-boxes',
      route: '/inventory',
      active: false
    },
    {
      label: 'Orders',
      icon: 'fas fa-shopping-cart',
      route: '/orders',
      active: false
    },
    {
      label: 'Reports',
      icon: 'fas fa-chart-bar',
      route: '/reports',
      active: false
    },
    {
      label: 'Notifications',
      icon: 'fas fa-bell',
      route: '/notifications',
      active: false
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.user$ = this.authService.getCurrentUser();
  }

  ngOnInit() {
    this.setupRouteTracking();
    this.updateActiveRoute();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouteTracking() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateActiveRoute();
      });
  }

  private updateActiveRoute() {
    this.navigationItems.forEach(item => {
      item.active = this.currentRoute === item.route || 
                   (item.route !== '/dashboard' && this.currentRoute.startsWith(item.route));
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  logout() {
    this.authService.signOut();
  }

}
