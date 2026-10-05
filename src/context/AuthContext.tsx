import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  role: UserRole;
  isAdmin: boolean;
  isLegalOrAbove: boolean;
  isComplianceOrAbove: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  switchSimulatedRole?: (newRole: UserRole) => void;
  effectiveRole: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BOOTSTRAP_ADMIN_EMAIL = 'lawyeregypt33@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);

  const fetchProfile = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const isMasterAdmin = (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase());

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // If master admin, guarantee Admin role
        const finalRole: UserRole = isMasterAdmin ? 'Admin' : (data.role || 'Compliance Officer');
        setUserProfile({
          ...data,
          id: user.uid,
          uid: user.uid,
          email: user.email || data.email,
          role: finalRole,
        });
      } else {
        // Create initial profile
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم النظام',
          role: isMasterAdmin ? 'Admin' : 'Legal Consultant',
          active: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, {
          ...initialProfile,
          serverTimestamp: serverTimestamp(),
        });
        setUserProfile(initialProfile);
      }
    } catch (err) {
      console.warn('Profile sync fallback:', err);
      // Fallback profile if Firestore permission or network is pending
      const isMasterAdmin = (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase());
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'مستشار ساعد',
        role: isMasterAdmin ? 'Admin' : 'Compliance Officer',
        active: true,
        createdAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      const msg = err?.message || 'فشل تسجيل الدخول';
      setError(msg);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole = 'Legal Consultant') => {
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        const isMasterAdmin = (email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase());
        const newProfile: UserProfile = {
          uid: res.user.uid,
          email,
          displayName: name,
          role: isMasterAdmin ? 'Admin' : role,
          active: true,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'users', res.user.uid), newProfile);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${res.user.uid}`);
        }
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء الحساب');
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول عبر Google');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال رابط استعادة كلمة المرور');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSimulatedRole(null);
    } catch (err: any) {
      setError(err?.message);
    }
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const actualRole: UserRole = userProfile?.role || 'Viewer';
  const effectiveRole: UserRole = simulatedRole || actualRole;

  const isAdmin = effectiveRole === 'Admin';
  const isLegalOrAbove = isAdmin || effectiveRole === 'Legal Consultant';
  const isComplianceOrAbove = isLegalOrAbove || effectiveRole === 'Compliance Officer';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        error,
        role: actualRole,
        effectiveRole,
        isAdmin,
        isLegalOrAbove,
        isComplianceOrAbove,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshUserProfile,
        switchSimulatedRole: (newRole) => setSimulatedRole(newRole),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
