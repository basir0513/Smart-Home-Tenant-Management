import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { UserDoc } from '../types';
import { Check, X, User as UserIcon, Clock, Shield, AlertCircle } from 'lucide-react';

export function Admin() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Admin component mounted, fetching users...");
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Users snapshot received, count:", snapshot.docs.length);
      const userData = snapshot.docs.map(doc => {
        const data = doc.data() as UserDoc;
        console.log("User data:", data);
        return { ...data };
      });
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      console.error("Admin users fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = async (uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const otherUsers = users.filter(u => u.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium">Approve or manage user access to the platform.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-xl">
          <Shield size={14} className="text-blue-400" />
          Admin Access
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="text-amber-400" size={16} />
            Pending Approvals
          </h2>
          <div className="grid gap-4">
            {pendingUsers.map(user => (
              <div key={user.uid} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{user.email}</p>
                    {user.homeName && <p className="text-xs text-blue-400 font-bold">{user.homeName}</p>}
                    <p className="text-xs text-slate-500 font-medium tracking-tight">Registered on {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleStatusChange(user.uid, 'approved')}
                    className="p-3 bg-emerald-400/10 text-emerald-400 rounded-2xl hover:bg-emerald-400/20 transition-all shadow-lg shadow-emerald-400/5 active:scale-95"
                    title="Approve"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => handleStatusChange(user.uid, 'rejected')}
                    className="p-3 bg-red-400/10 text-red-400 rounded-2xl hover:bg-red-400/20 transition-all shadow-lg shadow-red-400/5 active:scale-95"
                    title="Reject"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">All Users</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {otherUsers.map(user => (
                <tr key={user.uid} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{user.email}</p>
                    <p className="text-[10px] text-slate-500 font-mono font-medium">{user.uid}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      user.role === 'admin' ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      user.status === 'approved' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 
                      user.status === 'rejected' ? 'bg-red-400/10 text-red-400 border-red-400/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleStatusChange(user.uid, user.status === 'approved' ? 'rejected' : 'approved')}
                        className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
                      >
                        Toggle Status
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
