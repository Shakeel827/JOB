import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import {
  getUserProfile,
  createUserProfile,
  subscribeUserProfile,
  type UserProfile,
  type UserRole,
} from "./db";

const DEFAULT_ADMIN_PIN = "723899";

function getAdminPin(): string {
  return import.meta.env.VITE_ADMIN_PIN ?? DEFAULT_ADMIN_PIN;
}

export function validateAdminPin(pin: string): boolean {
  return pin.trim() === getAdminPin();
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployer: boolean;
}

const ADMIN_UNLOCK_SESSION_KEY = "career_compass_admin_unlocked";

const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  adminLogin: (pin: string, email: string, password: string) => Promise<void>;
  unlockAdmin: (pin: string) => Promise<void>;
  lockAdmin: () => void;
  adminUnlocked: boolean;
  signUp: (email: string, password: string, data: {
    displayName: string;
    phone?: string;
    role: UserRole;
    jobTitle?: string;
    experienceLevel?: string;
    skills: string[];
  }) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

const AUTH_LOAD_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, (u) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      cancelled = false;
      setUser(u);
      if (!u) {
        setProfile(null);
        setAdminUnlocked(false);
        try {
          sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
        } catch {
          // ignore
        }
        setLoading(false);
        return;
      }
      setLoading(true);
      const uid = u.uid;
      getUserProfile(uid)
        .then((p) => {
          if (cancelled) return;
          setProfile(p);
          profileUnsub = subscribeUserProfile(uid, setProfile);
        })
        .catch(() => {
          if (cancelled) return;
          setProfile(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      timeoutId = setTimeout(() => {
        if (!cancelled) setLoading(false);
        timeoutId = null;
      }, AUTH_LOAD_TIMEOUT_MS);
    });

    return () => {
      cancelled = true;
      unsub();
      if (profileUnsub) profileUnsub();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const adminLogin = async (pin: string, email: string, password: string) => {
    if (!validateAdminPin(pin)) {
      throw new Error("Invalid admin PIN");
    }
    await signInWithEmailAndPassword(auth, email, password);
    const p = await getUserProfile(auth.currentUser!.uid);
    if (p?.role !== "admin") {
      await firebaseSignOut(auth);
      throw new Error("This account is not an admin.");
    }
    setAdminUnlocked(true);
    try {
      sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, "true");
    } catch {
      // ignore
    }
  };

  const unlockAdmin = async (pin: string) => {
    if (!validateAdminPin(pin)) {
      throw new Error("Invalid admin PIN");
    }
    if (!auth.currentUser) {
      throw new Error("Please sign in first.");
    }
    const p = profile ?? (await getUserProfile(auth.currentUser.uid));
    if (p?.role !== "admin") {
      throw new Error("This account is not an admin.");
    }
    setAdminUnlocked(true);
    try {
      sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, "true");
    } catch {
      // ignore
    }
  };

  const lockAdmin = () => {
    setAdminUnlocked(false);
    try {
      sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const signUp = async (
    email: string,
    password: string,
    data: {
      displayName: string;
      phone?: string;
      role: UserRole;
      jobTitle?: string;
      experienceLevel?: string;
      skills: string[];
    }
  ) => {
    if (data.role !== "user" && data.role !== "employer") {
      throw new Error("Invalid role. Only User or Employer allowed.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: data.displayName });
      await createUserProfile(cred.user.uid, {
        uid: cred.user.uid,
        email: cred.user.email!,
        displayName: data.displayName,
        phone: data.phone,
        role: data.role,
        jobTitle: data.jobTitle,
        experienceLevel: data.experienceLevel,
        skills: data.skills,
      });
    }
  };

  const signOut = async () => {
    lockAdmin();
    await firebaseSignOut(auth);
  };

  const isAdmin = profile?.role === "admin";
  const isEmployer = profile?.role === "employer";
  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAdmin,
      isEmployer,
      signIn,
      adminLogin,
      unlockAdmin,
      lockAdmin,
      adminUnlocked,
      signUp,
      signOut,
    }),
    [user, profile, loading, isAdmin, isEmployer, adminUnlocked]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
