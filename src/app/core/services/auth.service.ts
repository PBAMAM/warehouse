import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    // Listen to auth state changes
    this.afAuth.authState.subscribe(user => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      if (user) {
        this.getUserData(user.uid).subscribe(userData => {
          console.log('User data loaded:', userData);
          this.userSubject.next(userData);
        });
      } else {
        console.log('No user, setting user to null');
        this.userSubject.next(null);
      }
    });
  }

  // Sign up with email and password
  async signUp(email: string, password: string, userData: Partial<User>): Promise<any> {
    try {
      const result = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (result.user) {
        await this.saveUserData(result.user.uid, {
          ...userData,
          email: result.user.email!,
          uid: result.user.uid,
          role: userData.role || 'employee',
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
        return result;
      }
    } catch (error) {
      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<any> {
    try {
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      if (result.user) {
        await this.updateLastLogin(result.user.uid);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.userSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): Observable<User | null> {
    return this.user$;
  }

  // Check if user is authenticated
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(
      map(user => !!user)
    );
  }

  // Check if user is admin
  isAdmin(): Observable<boolean> {
    return this.user$.pipe(
      map(user => user?.role === 'admin' || false)
    );
  }

  // Get user data from Firestore
  private getUserData(uid: string): Observable<User> {
    return this.firestore.collection('users').doc(uid).valueChanges().pipe(
      map(data => data as User)
    );
  }

  // Save user data to Firestore
  private async saveUserData(uid: string, userData: User): Promise<void> {
    await this.firestore.collection('users').doc(uid).set(userData);
  }

  // Update last login
  private async updateLastLogin(uid: string): Promise<void> {
    await this.firestore.collection('users').doc(uid).update({
      lastLoginAt: new Date()
    });
  }

  // Update user profile
  async updateProfile(uid: string, updates: Partial<User>): Promise<void> {
    await this.firestore.collection('users').doc(uid).update(updates);
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    await this.afAuth.sendPasswordResetEmail(email);
  }
}
