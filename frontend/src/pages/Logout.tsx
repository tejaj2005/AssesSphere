import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Logout = () => {
  const { isAuthenticated, logout } = useAuth();
  useEffect(() => { const t = setTimeout(() => logout(), 700); return () => clearTimeout(t); }, [logout]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
          <LogOut className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold">Signing you out…</p>
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Please wait
        </div>
      </motion.div>
    </div>
  );
};
