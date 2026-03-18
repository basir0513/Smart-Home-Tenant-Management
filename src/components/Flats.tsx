import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Flat } from '../types';
import { Plus, Search, Edit2, Trash2, X, Building2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export function Flats() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'flats'), where('ownerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setFlats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flat)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flats');
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      roomNo: formData.get('roomNo') as string,
      rent: Number(formData.get('rent')),
      status: formData.get('status') as any,
      ownerId: auth.currentUser?.uid,
    };

    try {
      if (editingFlat) {
        await updateDoc(doc(db, 'flats', editingFlat.id), data);
      } else {
        await addDoc(collection(db, 'flats'), data);
      }
      setIsModalOpen(false);
      setEditingFlat(null);
    } catch (error) {
      console.error("Error saving flat:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this flat?')) {
      await deleteDoc(doc(db, 'flats', id));
    }
  };

  const filteredFlats = flats.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.roomNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Flats</h1>
          <p className="text-slate-400">Manage your property units and availability.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Flat
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
                <th className="px-6 py-4 font-medium">Flat Name</th>
                <th className="px-6 py-4 font-medium">Room/Unit</th>
                <th className="px-6 py-4 font-medium">Expected Rent</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredFlats.map((flat) => (
                <tr key={flat.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-sm border border-slate-700">
                        <Building2 size={18} />
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{flat.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 font-medium">{flat.roomNo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(flat.rent)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      flat.status === 'Available' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                      flat.status === 'Occupied' ? "bg-blue-400/10 text-blue-400 border-blue-400/20" :
                      "bg-slate-400/10 text-slate-400 border-slate-400/20"
                    )}>
                      {flat.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingFlat(flat); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(flat.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFlats.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 size={40} className="text-slate-800" />
                      <p>No flats found.</p>
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
                {editingFlat ? 'Edit Flat' : 'Add New Flat'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingFlat(null); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Flat Name</label>
                <input name="name" defaultValue={editingFlat?.name} required placeholder="e.g. Green Villa A1" className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all placeholder:text-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Room/Unit No</label>
                  <input name="roomNo" defaultValue={editingFlat?.roomNo} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Rent</label>
                  <input name="rent" type="number" defaultValue={editingFlat?.rent} required className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <select name="status" defaultValue={editingFlat?.status || 'Available'} className="w-full px-4 py-3 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-950 text-white transition-all">
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-4">
                {editingFlat ? 'Update Flat' : 'Save Flat'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
