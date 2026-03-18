import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserDoc } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    
    // Check if user document exists
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      const isAdminEmail = user.email?.toLowerCase() === 'basirudden644@gmail.com';
      const newUserDoc: UserDoc = {
        uid: user.uid,
        email: user.email!,
        role: isAdminEmail ? 'admin' : 'user',
        status: isAdminEmail ? 'approved' : 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, newUserDoc);
    }
    return user;
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return;
    }
    console.error("Sign in error:", error);
    throw error;
  }
};

export const registerWithEmail = async (
  email: string, 
  pass: string, 
  firstName: string, 
  lastName: string, 
  nidPassport: string, 
  mobileNo: string,
  homeName: string
) => {
  console.log("Registering user:", email);
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  console.log("Auth user created:", user.uid);
  
  const isAdminEmail = email.toLowerCase() === 'basirudden644@gmail.com';
  
  // Create user document
  const userDoc: UserDoc = {
    uid: user.uid,
    email: user.email!,
    firstName,
    lastName,
    nidPassport,
    mobileNo,
    homeName,
    role: isAdminEmail ? 'admin' : 'user',
    status: isAdminEmail ? 'approved' : 'pending',
    createdAt: new Date().toISOString()
  };
  
  try {
    console.log("Setting user doc:", userDoc);
    await setDoc(doc(db, 'users', user.uid), userDoc);
    console.log("User doc set successfully");
  } catch (error) {
    console.error("Error setting user doc:", error);
    // Even if setDoc fails, the user is created in Auth
    // The App.tsx listener will handle the missing doc for admin
  }
  return user;
};

export const loginWithEmail = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getUserDoc = async (uid: string): Promise<UserDoc | null> => {
  const d = await getDoc(doc(db, 'users', uid));
  if (d.exists()) return d.data() as UserDoc;
  return null;
};

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
