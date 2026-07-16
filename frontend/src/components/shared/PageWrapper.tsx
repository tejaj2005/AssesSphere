import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { LoadingSkeleton } from './LoadingSkeleton';

export const PageWrapper = ({ children, loading: explicitLoading }: { children: ReactNode; loading?: boolean }) => {
  const [internalLoading, setInternalLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInternalLoading(false), 400);
    return () => clearTimeout(t);
  }, []);
  const loading = explicitLoading ?? internalLoading;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="skeleton" {...pageTransition} className="px-4 sm:px-8 py-6">
          <LoadingSkeleton />
        </motion.div>
      ) : (
        <motion.div key="content" {...pageTransition} className="px-4 sm:px-8 py-6">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
