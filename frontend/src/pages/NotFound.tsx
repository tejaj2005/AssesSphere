import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
      <p className="text-7xl font-bold tracking-tight bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" /> Go back</Button>
        <Button variant="accent" asChild><Link to="/"><Home className="h-4 w-4" /> Home</Link></Button>
      </div>
    </motion.div>
  </div>
);
