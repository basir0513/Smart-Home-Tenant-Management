import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Tenant, Flat } from '../types';
import { Plus, Search, MoreVertical, Edit2, Trash2, X, UserPlus, Building2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const tQuery = query(collection(db, 'tenants'), where('ownerId', '==', auth.currentUser.uid));
    const fQuery = query(collection(db, 'flats'), where('ownerId', '==', auth.currentUser.uid));

    const unsubT = onSnapshot(tQuery, (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tenants');
    });

    const unsubF = onSnapshot(fQuery, (snapshot) => {
      setFlats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flat)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flats');
    });

    return () => { unsubT(); unsubF(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const flatId = formData.get('flatId') as string;
    
    const data = {
      name: formData.get('name') as string,
      roomNo: formData.get('roomNo') as string,
      flatId: flatId || null,
      nid: formData.get('nid') as string,
      monthlyRent: Number(formData.get('monthlyRent')),
      contactInfo: formData.get('contactInfo') as string,
      status: formData.get('status') as any,
      joiningDate: formData.get('joiningDate') as string,
      ownerId: auth.currentUser?.uid,
    };

    try {
      if (editingTenant) {
        // If flat changed, free the old one
        if (editingTenant.flatId && editingTenant.flatId !== flatId) {
          await updateDoc(doc(db, 'flats', editingTenant.flatId), { status: 'Available' });
        }
        await updateDoc(doc(db, 'tenants', editingTenant.id), data);
      } else {
        await addDoc(collection(db, 'tenants'), data);
      }

      // Mark new flat as occupied
      if (flatId) {
        await updateDoc(doc(db, 'flats', flatId), { status: 'Occupied' });
      }

      setIsModalOpen(false);
      setEditingTenant(null);
    } catch (error) {
      console.error("Error saving tenant:", error);
    }
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      // Try to free the flat if it exists
      if (tenantToDelete.flatId) {
        try {
          await updateDoc(doc(db, 'flats', tenantToDelete.flatId), { status: 'Available' });
        } catch (e) {
          console.warn("Could not update flat status, it might have been deleted already:", e);
        }
      }
      
      // Delete the tenant record
      await deleteDoc(doc(db, 'tenants', tenantToDelete.id));
      
      setIsDeleteModalOpen(false);
      setTenantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tenants');
    }
  };

  const confirmDelete = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.roomNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tenants</h1>
          <p className="text-slate-400">Manage your residents and occupancy.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Add Tenant
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
          <Search className="text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Search by name or room..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Room</th>
                <th className="px-6 py-4 font-medium">Rent</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-sm border border-slate-700">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{tenant.name}</p>
                        <p className="text-xs text-slate-500">{tenant.contactInfo}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">NID: {tenant.nid || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 font-medium">{tenant.roomNo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(tenant.monthlyRent)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      tenant.status === 'Active' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                      tenant.status === 'Vacant' ? "bg-slate-400/10 text-slate-400 border-slate-400/20" :
                      "bg-amber-400/10 text-amber-400 border-amber-400/20"
                    )}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{tenant.joiningDate}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingTenant(tenant); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(tenant)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus size={40} className="text-slate-800" />
                      <p>No tenants found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTenant(null); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assigned Flat</label>
                <select 
                  name="flatId" 
                  defaultValue={editingTenant?.flatId} 
                  className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all"
                  onChange={(e) => {
                    const flat = flats.find(f => f.id === e.target.value);
                    if (flat) {
                      const rentInput = document.getElementsByName('monthlyRent')[0] as HTMLInputElement;
                      const roomInput = document.getElementsByName('roomNo')[0] as HTMLInputElement;
                      if (rentInput) rentInput.value = flat.rent.toString();
                      if (roomInput) roomInput.value = flat.roomNo;
                    }
                  }}
                >
                  <option value="">No Flat Assigned</option>
                  {flats.filter(f => f.status === 'Available' || f.id === editingTenant?.flatId).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.roomNo})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input name="name" defaultValue={editingTenant?.name} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">NID Number</label>
                  <input name="nid" defaultValue={editingTenant?.nid} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Room No</label>
                  <input name="roomNo" defaultValue={editingTenant?.roomNo} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Rent</label>
                  <input name="monthlyRent" type="number" defaultValue={editingTenant?.monthlyRent} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Info</label>
                <input name="contactInfo" defaultValue={editingTenant?.contactInfo} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                  <select name="status" defaultValue={editingTenant?.status || 'Active'} className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all">
                    <option value="Active">Active</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joining Date</label>
                  <input name="joiningDate" type="date" defaultValue={editingTenant?.joiningDate || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-4">
                {editingTenant ? 'Update Tenant' : 'Save Tenant'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-800 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">Confirm Deletion</h3>
            <p className="text-slate-400 text-sm mb-8">
              Are you sure you want to delete <span className="text-white font-bold">{tenantToDelete?.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setIsDeleteModalOpen(false); setTenantToDelete(null); }}
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
