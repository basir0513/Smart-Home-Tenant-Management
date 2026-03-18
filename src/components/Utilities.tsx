import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UtilityReading, Tenant, Payment } from '../types';
import { Zap, Calculator, Save, History, Users, X } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';

export function Utilities() {
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratePerUnit, setRatePerUnit] = useState(12);
  const [loading, setLoading] = useState(true);

  // Calculator state
  const [calcTenantId, setCalcTenantId] = useState('');
  const [prevReading, setPrevReading] = useState(0);
  const [currReading, setCurrReading] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const rQuery = query(collection(db, 'utilityReadings'), where('ownerId', '==', auth.currentUser.uid));
    const tQuery = query(collection(db, 'tenants'), where('ownerId', '==', auth.currentUser.uid));

    const unsubR = onSnapshot(rQuery, (snapshot) => {
      setReadings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityReading)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'utilityReadings');
    });

    const unsubT = onSnapshot(tQuery, (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });

    return () => { unsubR(); unsubT(); };
  }, []);

  const handleSaveReading = async () => {
    if (!calcTenantId || currReading < prevReading) return;

    const totalUnits = currReading - prevReading;
    const totalAmount = totalUnits * ratePerUnit;
    const month = format(new Date(), 'yyyy-MM');

    const data = {
      tenantId: calcTenantId,
      month,
      previousReading: prevReading,
      currentReading: currReading,
      totalUnits,
      ratePerUnit,
      totalAmount,
      ownerId: auth.currentUser?.uid,
    };

    try {
      // 1. Save the utility reading
      await addDoc(collection(db, 'utilityReadings'), data);

      // 2. Automatically update or create payment record
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef, 
        where('tenantId', '==', calcTenantId),
        where('billingMonth', '==', month),
        where('ownerId', '==', auth.currentUser?.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const tenant = tenants.find(t => t.id === calcTenantId);

      if (!querySnapshot.empty) {
        // Update existing payment record
        const paymentDoc = querySnapshot.docs[0];
        const paymentData = paymentDoc.data() as Payment;
        const newTotalDue = paymentData.totalDue + totalAmount;
        const newBalance = newTotalDue - paymentData.amountPaid;
        
        await updateDoc(doc(db, 'payments', paymentDoc.id), {
          totalDue: newTotalDue,
          balance: newBalance,
          status: newBalance <= 0 ? 'Paid' : (new Date() > new Date(paymentData.dueDate) ? 'Overdue' : 'Pending')
        });
      } else if (tenant) {
        // Create new payment record (Rent + Utility)
        const dueDate = format(new Date(), 'yyyy-MM-10');
        const totalDue = tenant.monthlyRent + totalAmount;
        
        await addDoc(collection(db, 'payments'), {
          tenantId: calcTenantId,
          billingMonth: month,
          totalDue: totalDue,
          amountPaid: 0,
          balance: totalDue,
          method: 'Cash',
          status: 'Pending',
          dueDate: dueDate,
          ownerId: auth.currentUser?.uid,
        });
      }

      setIsModalOpen(false);
      setCalcTenantId('');
      setPrevReading(0);
      setCurrReading(0);
    } catch (error) {
      console.error("Error saving reading and updating payment:", error);
    }
  };

  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || 'Unknown';
  const getTenantRoom = (id: string) => tenants.find(t => t.id === id)?.roomNo || '-';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Utility Management</h1>
          <p className="text-slate-500 font-medium">Calculate and track electricity bills.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rate/Unit:</span>
            <input 
              type="number" 
              value={ratePerUnit} 
              onChange={(e) => setRatePerUnit(Number(e.target.value))}
              className="w-12 text-sm font-black text-white bg-transparent focus:outline-none"
            />
            <span className="text-xs font-bold text-blue-400">৳</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            <Calculator size={18} />
            New Reading
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Readings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                <History size={16} className="text-blue-400" />
                Reading History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-6 py-4 font-medium">Tenant</th>
                    <th className="px-6 py-4 font-medium">Month</th>
                    <th className="px-6 py-4 font-medium">Units</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Reading (P/C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {readings.sort((a, b) => b.month.localeCompare(a.month)).map((reading) => (
                    <tr key={reading.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{getTenantName(reading.tenantId)}</p>
                        <p className="text-xs text-slate-500">Room {getTenantRoom(reading.tenantId)}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-bold">{reading.month}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">{reading.totalUnits}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-400">{formatCurrency(reading.totalAmount)}</td>
                      <td className="px-6 py-4 text-[10px] text-slate-500 font-mono font-bold">
                        {reading.previousReading} <span className="text-slate-700">→</span> {reading.currentReading}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Common Area Splitter (Demo Logic) */}
        <div className="space-y-6">
          <div className="bg-blue-600 text-white p-8 rounded-[2rem] shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
            <Zap className="absolute -right-6 -top-6 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
            <h3 className="text-xl font-black mb-2 tracking-tight">Common Area Bill</h3>
            <p className="text-blue-100 text-sm mb-8 font-medium">Divide shared electricity costs among active tenants.</p>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Total Common Bill (৳)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 5000"
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:border-white/40 transition-all font-bold"
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    const activeCount = tenants.filter(t => t.status === 'Active').length;
                    const perPerson = activeCount > 0 ? total / activeCount : 0;
                    const resultEl = document.getElementById('split-result');
                    if (resultEl) resultEl.innerText = formatCurrency(perPerson);
                  }}
                />
              </div>
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-100">Per Tenant ({tenants.filter(t => t.status === 'Active').length} active)</span>
                  <span id="split-result" className="text-2xl font-black tracking-tight">৳0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
            <h4 className="text-xs font-bold text-slate-500 mb-5 flex items-center gap-2 uppercase tracking-widest">
              <Users size={16} className="text-blue-400" />
              Active Tenants
            </h4>
            <div className="space-y-3">
              {tenants.filter(t => t.status === 'Active').map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors group">
                  <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{t.name}</span>
                  <span className="text-slate-500 font-mono text-[10px] font-bold bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">{t.roomNo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                <Calculator size={20} className="text-blue-400" />
                Unit Calculator
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tenant</label>
                <select 
                  value={calcTenantId}
                  onChange={(e) => {
                    setCalcTenantId(e.target.value);
                    // Find last reading for this tenant
                    const lastReading = readings
                      .filter(r => r.tenantId === e.target.value)
                      .sort((a, b) => b.month.localeCompare(a.month))[0];
                    if (lastReading) setPrevReading(lastReading.currentReading);
                    else setPrevReading(0);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all"
                >
                  <option value="">Select Tenant</option>
                  {tenants.filter(t => t.status === 'Active').map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.roomNo})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Previous Reading</label>
                  <input 
                    type="number" 
                    value={prevReading}
                    onChange={(e) => setPrevReading(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Reading</label>
                  <input 
                    type="number" 
                    value={currReading}
                    onChange={(e) => setCurrReading(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" 
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Total Units:</span>
                  <span className="font-black text-white">{Math.max(0, currReading - prevReading)} Units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Rate:</span>
                  <span className="font-black text-blue-400">৳{ratePerUnit}/Unit</span>
                </div>
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-300">Total Bill:</span>
                  <span className="text-2xl font-black text-emerald-400 tracking-tight">{formatCurrency(Math.max(0, currReading - prevReading) * ratePerUnit)}</span>
                </div>
              </div>

              <button 
                onClick={handleSaveReading}
                disabled={!calcTenantId || currReading < prevReading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
