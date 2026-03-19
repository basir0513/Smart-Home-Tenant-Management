/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, logout } from './firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Tenants } from './components/Tenants';
import { Flats } from './components/Flats';
import { Payments } from './components/Payments';
import { Utilities } from './components/Utilities';
import { Auth } from './components/Auth';
import { Admin } from './components/Admin';
import { HomeSetup } from './components/HomeSetup';
import { FirestoreErrorBoundary } from './components/FirestoreErrorBoundary';
import { UserDoc } from './types';
import { LogIn, Home, Users, CreditCard, Zap, Building2, Clock, AlertCircle } from 'lucide-react';

type View = 'dashboard' | 'tenants' | 'flats' | 'payments' | 'utilities' | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    const handleChangeView = (e: any) => {
      setCurrentView(e.detail);
    };
    window.addEventListener('changeView', handleChangeView);
    return () => window.removeEventListener('changeView', handleChangeView);
  }, []);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }

      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserDoc;
            // Force admin status for the specific admin email
            if (user.email?.toLowerCase() === 'basirudden644@gmail.com') {
              data.role = 'admin';
              data.status = 'approved';
            }
            setUserDoc(data);
          } else {
            // If doc doesn't exist, it might be a new registration
            // or the admin who hasn't had their doc created yet
            if (user.email?.toLowerCase() === 'basirudden644@gmail.com') {
              setUserDoc({
                uid: user.uid,
                email: user.email!,
                role: 'admin',
                status: 'approved',
                homeName: 'Smart Property',
                createdAt: new Date().toISOString()
              });
            } else {
              setUserDoc(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user profile:', error);
          // If we can't read the user doc, we might still be the admin
          if (user.email?.toLowerCase() === 'basirudden644@gmail.com') {
            setUserDoc({
              uid: user.uid,
              email: user.email!,
              role: 'admin',
              status: 'approved',
              homeName: 'Smart Property',
              createdAt: new Date().toISOString()
            });
          }
          setLoading(false);
        });
      } else {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const isAdminEmail = user.email?.toLowerCase() === 'basirudden644@gmail.com';

  if (!userDoc || (userDoc.status === 'pending' && !isAdminEmail)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-10 text-center">
          <div className="w-20 h-20 bg-amber-400/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-400/5">
            <Clock className="text-amber-400 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Waiting for Approval</h1>
          <p className="text-slate-400 mb-10 font-medium">
            Your account has been registered successfully. Please wait for an administrator to approve your access.
          </p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-4 px-4 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (userDoc.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-10 text-center">
          <div className="w-20 h-20 bg-red-400/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-400/5">
            <AlertCircle className="text-red-400 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Access Denied</h1>
          <p className="text-slate-400 mb-10 font-medium">
            Your account request has been rejected. Please contact the administrator for more information.
          </p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-4 px-4 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!userDoc.homeName) {
    return <HomeSetup uid={user.uid} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard userDoc={userDoc} />;
      case 'tenants': return <Tenants />;
      case 'flats': return <Flats />;
      case 'payments': return <Payments />;
      case 'utilities': return <Utilities />;
      case 'admin': return <Admin />;
    }
  };

  return (
    <Layout 
      user={user} 
      userDoc={userDoc}
      currentView={currentView} 
      onViewChange={setCurrentView}
      onLogout={logout}
    >
      <FirestoreErrorBoundary>
        {renderView()}
      </FirestoreErrorBoundary>
    </Layout>
  );
}


