import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';

import { environment } from '../../environments/environment';

// Services
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { LoadingService } from './services/loading.service';
import { ErrorHandlerService } from './services/error-handler.service';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireMessagingModule,
  ],
  providers: [
    // Services
    AuthService,
    NotificationService,
    LoadingService,
    ErrorHandlerService,
    
    // Guards
    AuthGuard,
    AdminGuard,
    
    // Interceptors
    AuthInterceptor,
    LoadingInterceptor,
    ErrorInterceptor,
  ],
  exports: [
    AngularFireModule,
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireMessagingModule,
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only');
    }
  }
}
