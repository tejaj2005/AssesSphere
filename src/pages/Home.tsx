import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, BarChart3, Boxes, Sun, Moon, Workflow, Package, Microscope } from 'lucide-react';
import { AssessSphereLogo } from '@/components/AssessSphereLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { staggerContainer, staggerItem } from '@/lib/animations';

const features = [
  { icon: Workflow, title: 'Organization Setup', text: 'Manage departments, users, roles and permissions in a centralized hub.' },
  { icon: Package, title: 'Product Configuration', text: 'Configure products, components, manufacturing and assembly stages.' },
  { icon: Microscope, title: 'Inspection Tools', text: 'Set up inspection types, equipment with calibration tracking, and methods.' },
  { icon: Boxes, title: 'Materials & Suppliers', text: 'Maintain a comprehensive directory of materials and supplier evaluations.' },
  { icon: BarChart3, title: 'Real-time Insights', text: 'Dashboard with live KPIs, charts and an audit trail of every change.' },
  { icon: ShieldCheck, title: 'Enterprise Security', text: 'Role-based access control with system-managed roles and audit logs.' },
];

export const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-16 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center px-4 sm:px-8">
        <Link to="/" className="flex items-center">
          <AssessSphereLogo size={40} showText showPoweredBy />
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-10 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {isAuthenticated ? (
            <Button variant="accent" asChild>
              <Link to="/app">Open Dashboard <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
              <Button variant="accent" asChild><Link to="/login">Get Started</Link></Button>
            </>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 text-center relative">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs font-medium mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-balance">
              Quality assessment with{' '}
              <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">precision</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              An enterprise-grade Product Quality Assurance System for engineering teams. Streamline organization setup, configure inspections, and monitor every step from raw material to delivery.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="accent" size="lg" asChild>
                <Link to={isAuthenticated ? '/app' : '/login'}>
                  {isAuthenticated ? `Continue as ${user?.name?.split(' ')[0]}` : 'Get Started Free'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to ship quality</h2>
          <p className="mt-3 text-muted-foreground">Sixteen integrated modules in one unified admin platform.</p>
        </div>
        <motion.div
          variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={staggerItem} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="rounded-2xl border bg-gradient-to-br from-primary to-slate-900 dark:from-slate-900 dark:to-slate-950 p-10 sm:p-16 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to transform your quality workflow?</h2>
          <p className="mt-3 text-white/70 max-w-xl mx-auto">Join leading manufacturers using PQAS to deliver consistent, high-quality products at scale.</p>
          <div className="mt-8">
            <Button variant="accent" size="lg" asChild>
              <Link to={isAuthenticated ? '/app' : '/login'}>
                {isAuthenticated ? 'Open Admin Dashboard' : 'Sign in to Continue'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; 2026 Precision Parts Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
