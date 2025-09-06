export interface User {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  department?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  permissions?: string[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  avatar?: string;
}
