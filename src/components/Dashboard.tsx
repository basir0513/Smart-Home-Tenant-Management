import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Tenant, Payment, UserDoc, Flat, UtilityReading } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  TrendingUp, Users, CreditCard, AlertCircle, Clock, ShieldAlert, 
  Zap, Activity, Lock, MapPin, DollarSign, Percent, ChevronRight,
  Wallet, Receipt, Calculator, ArrowUpRight, Home
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../lib/utils';

export function Dashboard({ userDoc }: { userDoc: UserDoc | null }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [utilityReadings, setUtilityReadings] = useState<UtilityReading[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const isAdminEmail = auth.currentUser.email?.toLowerCase() === 'basirudden644@gmail.com';
    setIsAdmin(isAdminEmail);

    if (isAdminEmail) {
      const usersQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
      const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setPendingUsersCount(snapshot.docs.length);
      }, (error) => {
        console.error("Error fetching pending users:", error);
      });
      return () => unsubUsers();
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const tenantsQuery = query(
      collection(db, 'tenants'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const flatsQuery = query(
      collection(db, 'flats'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const utilityQuery = query(
      collection(db, 'utilityReadings'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubTenants = onSnapshot(tenantsQuery, (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });

    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      // Sort by billingMonth desc client-side
      paymentsData.sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
      setPayments(paymentsData.slice(0, 100));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    });

    const unsubFlats = onSnapshot(flatsQuery, (snapshot) => {
      setFlats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flat)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flats');
    });

    const unsubUtility = onSnapshot(utilityQuery, (snapshot) => {
      setUtilityReadings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityReading)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'utilityReadings');
    });

    return () => {
      unsubTenants();
      unsubPayments();
      unsubFlats();
      unsubUtility();
    };
  }, []);

  const stats = {
    totalRevenue: payments.reduce((acc, p) => acc + p.totalDue, 0),
    receivedAmount: payments.reduce((acc, p) => acc + p.amountPaid, 0),
    pendingAmount: payments.reduce((acc, p) => acc + p.balance, 0),
    activeTenants: tenants.filter(t => t.status === 'Active').length,
    vacantUnits: flats.filter(f => f.status === 'Available').length,
    maintenanceRequests: flats.filter(f => f.status === 'Maintenance').length,
    occupancyRate: flats.length > 0 ? (flats.filter(f => f.status === 'Occupied').length / flats.length) * 100 : 0,
    utilityTotal: utilityReadings.reduce((acc, u) => acc + u.totalAmount, 0),
    utilityPending: utilityReadings.reduce((acc, u) => {
      // Find corresponding payment for this utility reading
      const payment = payments.find(p => p.tenantId === u.tenantId && p.billingMonth === u.month);
      if (payment && payment.status !== 'Paid') {
        // If payment is pending, we consider the utility portion pending too
        // Since we don't have a partial payment breakdown, we'll use the utility amount
        return acc + u.totalAmount;
      }
      return acc;
    }, 0),
  };

  const energyData = [
    { month: 'Jan', usage: 400 },
    { month: 'Feb', usage: 600 },
    { month: 'Mar', usage: 500 },
    { month: 'Apr', usage: 900 },
    { month: 'May', usage: 700 },
  ];

  const deviceHealthData = [
    { name: 'Healthy', value: 85 },
    { name: 'Warning', value: 10 },
    { name: 'Critical', value: 5 },
  ];
  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return <div className="animate-pulse space-y-8 bg-[#0f172a] p-8 rounded-3xl min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-800 rounded-2xl"></div>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => <div key={i} className="h-96 bg-slate-800 rounded-2xl"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] shadow-2xl space-y-8 text-slate-200 min-h-screen">
      {userDoc?.homeName && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Home size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-[0.2em] mb-2">Welcome to</p>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-md">
              {userDoc.homeName}
            </h1>
            <div className="mt-4 flex items-center gap-2 text-blue-100/80 font-medium">
              <MapPin size={16} />
              <span>Smart Property Management System</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {userDoc?.homeName ? 'Dashboard Overview' : 'Property Dashboard'}
          </h1>
          <p className="text-slate-400 mt-1">Tenant Management & Property Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Clock size={20} />
          </button>
          <button className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors relative">
            <AlertCircle size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 overflow-hidden">
            <img src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.email}`} alt="User" />
          </div>
        </div>
      </div>

      {isAdmin && pendingUsersCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-200">{pendingUsersCount} Pending Approvals</p>
              <p className="text-xs text-amber-400/80">New users are waiting for your approval.</p>
            </div>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'admin' }))}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tenants Overview */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">Tenants Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                <span className="text-slate-300">Active Tenants:</span>
                <span className="text-2xl font-bold text-emerald-500">{stats.activeTenants}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                <span className="text-slate-300">Vacant Units:</span>
                <span className="text-2xl font-bold text-amber-500">{stats.vacantUnits}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-slate-300">Maintenance:</span>
                </div>
                <span className="text-2xl font-bold text-red-500">{stats.maintenanceRequests}</span>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Recent Activities</h3>
              <button className="text-slate-500 hover:text-white transition-colors">...</button>
            </div>
            <div className="space-y-4">
              {payments.slice(0, 4).map((payment, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 group-hover:bg-slate-600 transition-colors">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">Payment received</p>
                    <p className="text-xs text-slate-500 truncate">{payment.billingMonth}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Financial Stats & Property Status */}
        <div className="lg:col-span-6 space-y-6">
          {/* Financial Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                <Receipt size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pending Amount</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
                <Calculator size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Utility Total</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.utilityTotal)}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Utility Pending</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.utilityPending)}</p>
              </div>
            </div>
          </div>

          {/* Property Status (Moved Down) */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">Property Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Energy Usage</span>
                  <Zap size={14} className="text-yellow-500" />
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={energyData}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="usage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsage)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4 text-center">
                <span className="text-xs font-medium text-slate-400">Device Health</span>
                <div className="h-32 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceHealthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceHealthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Activity size={16} className="text-emerald-500 mb-1" />
                    <span className="text-xs font-bold text-white">85%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Smart Locks</span>
                  <Lock size={14} className="text-emerald-500" />
                </div>
                <div className="flex flex-col items-center justify-center h-32 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                    <Lock size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-300">All Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financials */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">Income (Current Month)</h3>
            <div className="space-y-2">
              <p className="text-4xl font-bold text-white">{formatCurrency(stats.receivedAmount)}</p>
              <div className="flex items-center gap-2 text-emerald-500 text-sm">
                <TrendingUp size={16} />
                <span>+12.5% from last month</span>
              </div>
            </div>
            <div className="mt-8 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energyData}>
                  <Bar dataKey="usage" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">Occupancy Rate</h3>
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-white">{stats.occupancyRate.toFixed(0)}%</p>
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${stats.occupancyRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-500 mb-1">Target</p>
                  <p className="text-sm font-bold text-white">95%</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className="text-sm font-bold text-emerald-500">Optimal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


