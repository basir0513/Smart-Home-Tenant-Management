export interface UserDoc {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  nidPassport?: string;
  mobileNo?: string;
  homeName?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  roomNo: string;
  flatId?: string;
  nid: string;
  monthlyRent: number;
  contactInfo: string;
  status: 'Active' | 'Vacant' | 'Archived';
  joiningDate: string;
  ownerId: string;
}

export interface Flat {
  id: string;
  name: string;
  roomNo: string;
  rent: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  ownerId: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  billingMonth: string; // YYYY-MM
  totalDue: number;
  amountPaid: number;
  balance: number;
  method: 'Cash' | 'Bank' | 'Bkash' | 'Nagad' | 'Rocket';
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  ownerId: string;
}

export interface UtilityReading {
  id: string;
  tenantId: string;
  month: string;
  previousReading: number;
  currentReading: number;
  totalUnits: number;
  ratePerUnit: number;
  totalAmount: number;
  ownerId: string;
}

export interface DashboardStats {
  totalRevenue: number;
  receivedAmount: number;
  pendingAmount: number;
  occupancyRate: number;
}
