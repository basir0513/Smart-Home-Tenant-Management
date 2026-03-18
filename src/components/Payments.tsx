import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Payment, Tenant, UtilityReading } from '../types';
import { Plus, Search, Filter, CreditCard, CheckCircle, Clock, AlertTriangle, X, FileText, Printer, Download } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'MM'));
  const [filterYear, setFilterYear] = useState(format(new Date(), 'yyyy'));
  const [loading, setLoading] = useState(true);
  const [formTotalDue, setFormTotalDue] = useState(0);
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (editingPayment) {
      setFormTotalDue(editingPayment.totalDue);
      setFormAmountPaid(editingPayment.amountPaid);
    } else {
      setFormTotalDue(0);
      setFormAmountPaid(0);
    }
  }, [editingPayment, isModalOpen]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const pQuery = query(collection(db, 'payments'), where('ownerId', '==', auth.currentUser.uid));
    const tQuery = query(collection(db, 'tenants'), where('ownerId', '==', auth.currentUser.uid));
    const rQuery = query(collection(db, 'utilityReadings'), where('ownerId', '==', auth.currentUser.uid));

    const unsubP = onSnapshot(pQuery, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    });

    const unsubT = onSnapshot(tQuery, (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });

    const unsubR = onSnapshot(rQuery, (snapshot) => {
      setReadings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityReading)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'utilityReadings');
    });

    return () => { unsubP(); unsubT(); unsubR(); };
  }, []);

  const updateCalculatedDue = (tenantId: string, month: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const utilityReading = readings.find(r => r.tenantId === tenantId && r.month === month);
    const utilityAmount = utilityReading ? utilityReading.totalAmount : 0;
    
    setFormTotalDue(tenant.monthlyRent + utilityAmount);
  };

  useEffect(() => {
    if (!editingPayment && selectedTenantId && selectedMonth) {
      updateCalculatedDue(selectedTenantId, selectedMonth);
    }
  }, [selectedTenantId, selectedMonth, readings, tenants]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tenantId = formData.get('tenantId') as string;
    const totalDue = Number(formData.get('totalDue'));
    const amountPaid = Number(formData.get('amountPaid'));
    const balance = totalDue - amountPaid;
    
    let status: 'Paid' | 'Pending' | 'Overdue' = 'Pending';
    if (balance <= 0) status = 'Paid';
    else {
      const dueDate = new Date(formData.get('dueDate') as string);
      if (new Date() > dueDate) status = 'Overdue';
    }

    const data = {
      tenantId,
      billingMonth: formData.get('billingMonth') as string,
      totalDue,
      amountPaid,
      balance,
      method: formData.get('method') as any,
      status,
      dueDate: formData.get('dueDate') as string,
      ownerId: auth.currentUser?.uid,
    };

    try {
      if (editingPayment) {
        await updateDoc(doc(db, 'payments', editingPayment.id), data);
      } else {
        await addDoc(collection(db, 'payments'), data);
      }
      setIsModalOpen(false);
      setEditingPayment(null);
    } catch (error) {
      console.error("Error saving payment:", error);
    }
  };

  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || 'Unknown';
  const getTenantRoom = (id: string) => tenants.find(t => t.id === id)?.roomNo || '-';

  const filteredPayments = payments.filter(p => {
    const matchesSearch = getTenantName(p.tenantId).toLowerCase().includes(search.toLowerCase());
    const filterValue = filterMonth && filterYear ? `${filterYear}-${filterMonth}` : null;
    const matchesMonth = filterValue ? p.billingMonth === filterValue : true;
    return matchesSearch && matchesMonth;
  }).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthLabel = filterMonth ? format(new Date(parseInt(filterYear), parseInt(filterMonth) - 1), 'MMMM yyyy') : 'All Time';
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('Financial Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: ${monthLabel}`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 37);
    
    // Summary Table
    const summaryData = [
      ['Total Billing', formatCurrency(paymentSummary.totalBilled)],
      ['Total Received', formatCurrency(paymentSummary.totalReceived)],
      ['Total Due', formatCurrency(paymentSummary.totalDue)],
      ['Utility Total', formatCurrency(utilitySummary.totalUtility)],
      ['Utility Received', formatCurrency(utilitySummary.utilityReceived)],
      ['Utility Due', formatCurrency(utilityDue)]
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Payments Table
    const tableData = filteredPayments.map(p => [
      getTenantName(p.tenantId),
      p.billingMonth,
      formatCurrency(p.totalDue),
      formatCurrency(p.amountPaid),
      formatCurrency(p.balance),
      p.status
    ]);
    
    doc.text('Payment Details', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Tenant', 'Month', 'Total Due', 'Paid', 'Balance', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }
    });
    
    doc.save(`Financial_Report_${monthLabel.replace(' ', '_')}.pdf`);
  };

  const generateInvoicePDF = (payment: Payment) => {
    const doc = new jsPDF();
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const utility = readings.find(r => r.tenantId === payment.tenantId && r.month === payment.billingMonth);
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text('INVOICE', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice ID: #${payment.id.slice(0, 8)}`, 14, 32);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, 14, 37);
    
    // Billed To
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('BILLED TO:', 14, 50);
    doc.setFontSize(14);
    doc.text(getTenantName(payment.tenantId), 14, 58);
    doc.setFontSize(10);
    doc.text(`Room: ${getTenantRoom(payment.tenantId)}`, 14, 64);
    
    // Details
    const invoiceRows = [
      ['Monthly Rent', formatCurrency(tenant?.monthlyRent || 0)],
    ];
    
    if (utility) {
      invoiceRows.push(['Utility Bill', formatCurrency(utility.totalAmount)]);
    }
    
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Amount']],
      body: invoiceRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Totals
    doc.setFontSize(12);
    doc.text(`Total Due: ${formatCurrency(payment.totalDue)}`, 140, finalY + 15);
    doc.setTextColor(16, 185, 129);
    doc.text(`Amount Paid: ${formatCurrency(payment.amountPaid)}`, 140, finalY + 22);
    doc.setTextColor(239, 68, 68);
    doc.text(`Balance: ${formatCurrency(payment.balance)}`, 140, finalY + 29);
    
    doc.save(`Invoice_${getTenantName(payment.tenantId).replace(' ', '_')}_${payment.billingMonth}.pdf`);
  };

  const currentFilterMonth = filterMonth && filterYear ? `${filterYear}-${filterMonth}` : null;
  
  const paymentSummary = filteredPayments.reduce((acc, p) => {
    acc.totalBilled += p.totalDue;
    acc.totalReceived += p.amountPaid;
    acc.totalDue += p.balance;
    return acc;
  }, { totalBilled: 0, totalReceived: 0, totalDue: 0 });

  const utilitySummary = readings.filter(r => currentFilterMonth ? r.month === currentFilterMonth : true).reduce((acc, r) => {
    acc.totalUtility += r.totalAmount;
    
    // Check if this utility has been paid (via payments)
    const payment = payments.find(p => p.tenantId === r.tenantId && p.billingMonth === r.month);
    if (payment) {
      if (payment.status === 'Paid') {
        acc.utilityReceived += r.totalAmount;
      } else if (payment.amountPaid > 0) {
        // Pro-rate utility payment if partial payment exists
        // This is an estimate: assume rent is paid first, then utility
        const tenant = tenants.find(t => t.id === r.tenantId);
        const rent = tenant?.monthlyRent || 0;
        const utilityPaid = Math.max(0, payment.amountPaid - rent);
        acc.utilityReceived += Math.min(r.totalAmount, utilityPaid);
      }
    }
    return acc;
  }, { totalUtility: 0, utilityReceived: 0 });

  const utilityDue = utilitySummary.totalUtility - utilitySummary.utilityReceived;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-slate-400">Track rent collection and balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generatePDF}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-all border border-slate-700 no-print"
          >
            <Download size={18} />
            Download PDF Report
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] no-print"
          >
            <Plus size={18} />
            Record Payment
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="relative">
        <div className="hidden print:block mb-6">
          <h2 className="text-2xl font-bold text-black">Financial Report - {filterMonth ? format(new Date(parseInt(filterYear), parseInt(filterMonth) - 1), 'MMMM yyyy') : 'All Time'}</h2>
          <p className="text-slate-600">Generated on {format(new Date(), 'PPP')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Billing</p>
            <p className="text-lg font-black text-white">{formatCurrency(paymentSummary.totalBilled)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Received</p>
            <p className="text-lg font-black text-emerald-400">{formatCurrency(paymentSummary.totalReceived)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Due</p>
            <p className="text-lg font-black text-red-400">{formatCurrency(paymentSummary.totalDue)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Utility Total</p>
            <p className="text-lg font-black text-blue-400">{formatCurrency(utilitySummary.totalUtility)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Utility Received</p>
            <p className="text-lg font-black text-emerald-400">{formatCurrency(utilitySummary.utilityReceived)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Utility Due</p>
            <p className="text-lg font-black text-amber-400">{formatCurrency(utilityDue)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center gap-4 bg-slate-900/50 no-print">
          <div className="flex-1 flex items-center gap-3">
            <Search className="text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search by tenant name..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-500" size={18} />
            <select 
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-white transition-all"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">Month</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select 
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-white transition-all"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button 
              onClick={() => { setFilterMonth(''); setFilterYear(''); }}
              className="text-xs text-slate-500 hover:text-white font-bold ml-2 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Month</th>
                <th className="px-6 py-4 font-medium">Total Due</th>
                <th className="px-6 py-4 font-medium">Paid</th>
                <th className="px-6 py-4 font-medium">Balance</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{getTenantName(payment.tenantId)}</p>
                      <p className="text-xs text-slate-500">Room {getTenantRoom(payment.tenantId)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 font-medium">{payment.billingMonth}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(payment.totalDue)}</td>
                  <td className="px-6 py-4 text-sm text-emerald-400 font-bold">{formatCurrency(payment.amountPaid)}</td>
                  <td className="px-6 py-4 text-sm text-red-400 font-bold">{formatCurrency(payment.balance)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {payment.status === 'Paid' ? <CheckCircle size={14} className="text-emerald-400" /> :
                       payment.status === 'Overdue' ? <AlertTriangle size={14} className="text-red-400" /> :
                       <Clock size={14} className="text-amber-400" />}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        payment.status === 'Paid' ? "text-emerald-400" :
                        payment.status === 'Overdue' ? "text-red-400" :
                        "text-amber-400"
                      )}>
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right no-print">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setInvoicePayment(payment); setShowInvoice(true); }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="View Invoice"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => { setEditingPayment(payment); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Payment"
                      >
                        <CreditCard size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {editingPayment ? 'Update Payment' : 'Record New Payment'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingPayment(null); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tenant</label>
                <select 
                  name="tenantId" 
                  defaultValue={editingPayment?.tenantId} 
                  required 
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all"
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                  }}
                >
                  <option value="">Select Tenant</option>
                  {tenants.filter(t => t.status === 'Active').map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.roomNo})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Billing Month</label>
                  <input 
                    name="billingMonth" 
                    type="month" 
                    defaultValue={editingPayment?.billingMonth || format(new Date(), 'yyyy-MM')} 
                    required 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Date</label>
                  <input name="dueDate" type="date" defaultValue={editingPayment?.dueDate || format(new Date(), 'yyyy-MM-10')} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Due</label>
                  <input 
                    id="totalDue" 
                    name="totalDue" 
                    type="number" 
                    value={formTotalDue} 
                    onChange={(e) => setFormTotalDue(Number(e.target.value))}
                    required 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount Paid</label>
                  <input 
                    name="amountPaid" 
                    type="number" 
                    value={formAmountPaid} 
                    onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                    required 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" 
                  />
                </div>
              </div>

              {selectedTenantId && selectedMonth && !editingPayment && readings.find(r => r.tenantId === selectedTenantId && r.month === selectedMonth) && (
                <div className="p-4 bg-amber-400/10 rounded-2xl border border-amber-400/20 space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Bill Breakdown</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400/70">Monthly Rent:</span>
                    <span className="font-bold text-amber-400">{formatCurrency(tenants.find(t => t.id === selectedTenantId)?.monthlyRent || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400/70">Utility Bill:</span>
                    <span className="font-bold text-amber-400">{formatCurrency(readings.find(r => r.tenantId === selectedTenantId && r.month === selectedMonth)?.totalAmount || 0)}</span>
                  </div>
                </div>
              )}

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center shadow-inner">
                <span className="text-sm font-bold text-slate-400">Remaining Balance:</span>
                <span className={cn(
                  "text-xl font-black tracking-tight",
                  (formTotalDue - formAmountPaid) <= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {formatCurrency(formTotalDue - formAmountPaid)}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Method</label>
                <select name="method" defaultValue={editingPayment?.method || 'Cash'} className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-4">
                {editingPayment ? 'Update Record' : 'Save Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showInvoice && invoicePayment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Payment Invoice</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Invoice #{invoicePayment.id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button 
                  onClick={() => generateInvoicePDF(invoicePayment)} 
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-bold text-sm border border-blue-100"
                >
                  <Download size={18} />
                  Download PDF Invoice
                </button>
                <button 
                  onClick={() => { setShowInvoice(false); setInvoicePayment(null); }} 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billed To</p>
                    <p className="text-lg font-black">{getTenantName(invoicePayment.tenantId)}</p>
                    <p className="text-sm text-slate-500 font-medium">Room {getTenantRoom(invoicePayment.tenantId)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billing Month</p>
                    <p className="text-sm font-bold">{invoicePayment.billingMonth}</p>
                  </div>
                </div>
                <div className="text-right space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Date</p>
                    <p className="text-sm font-bold">{format(new Date(), 'dd MMMM, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                    <p className="text-sm font-bold text-red-600">{format(new Date(invoicePayment.dueDate), 'dd MMMM, yyyy')}</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold">Monthly Rent</p>
                        <p className="text-xs text-slate-500">Rent for {invoicePayment.billingMonth}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold">
                        {formatCurrency(tenants.find(t => t.id === invoicePayment.tenantId)?.monthlyRent || 0)}
                      </td>
                    </tr>
                    {readings.find(r => r.tenantId === invoicePayment.tenantId && r.month === invoicePayment.billingMonth) && (
                      <tr>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">Utility Bill</p>
                          <p className="text-xs text-slate-500">Electricity/Water for {invoicePayment.billingMonth}</p>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold">
                          {formatCurrency(readings.find(r => r.tenantId === invoicePayment.tenantId && r.month === invoicePayment.billingMonth)?.totalAmount || 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-bold text-slate-500">Total Amount Due</td>
                      <td className="px-6 py-4 text-right text-lg font-black text-blue-600">{formatCurrency(invoicePayment.totalDue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Amount Paid</p>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrency(invoicePayment.amountPaid)}</p>
                  <p className="text-xs text-emerald-600/70 font-medium mt-1">Via {invoicePayment.method}</p>
                </div>
                <div className={cn(
                  "p-6 rounded-3xl border",
                  invoicePayment.balance <= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                    invoicePayment.balance <= 0 ? "text-blue-600" : "text-red-600"
                  )}>Remaining Balance</p>
                  <p className={cn(
                    "text-2xl font-black",
                    invoicePayment.balance <= 0 ? "text-blue-700" : "text-red-700"
                  )}>{formatCurrency(invoicePayment.balance)}</p>
                  <p className={cn(
                    "text-xs font-medium mt-1",
                    invoicePayment.balance <= 0 ? "text-blue-600/70" : "text-red-600/70"
                  )}>{invoicePayment.balance <= 0 ? 'Full Paid' : 'Pending Payment'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-xs font-bold">
                  <CheckCircle size={14} />
                  Verified Payment
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
