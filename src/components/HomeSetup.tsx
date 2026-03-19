import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Home, ArrowRight, Building2 } from 'lucide-react';

interface HomeSetupProps {
  uid: string;
}

export function HomeSetup({ uid }: HomeSetupProps) {
  const [homeName, setHomeName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeName.trim()) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        homeName: homeName.trim()
      }, { merge: true });
    } catch (error) {
      console.error("Error setting home name:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-10 text-center">
        <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-600/5">
          <Building2 className="text-blue-500 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Name Your Property</h1>
        <p className="text-slate-400 mb-10 font-medium">
          Please provide a name for your home or property to complete your profile.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Home Name</label>
            <div className="relative">
              <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                required
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                placeholder="e.g. Dream Villa"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !homeName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
