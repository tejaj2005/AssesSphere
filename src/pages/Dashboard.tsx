import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import { ChartTooltip, chartGrid, chartAxisTick, chartAxisLine, chartLegendStyle, barCursor } from '@/components/dashboard/ChartTooltip';
import { Package, Layers, Factory, AlertTriangle, Users as UsersIcon, Building, ClipboardList, Plus, Pencil, Trash2, Activity } from 'lucide-react';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { relativeTime } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useChartColors } from '@/lib/chartColors';

export const Dashboard = () => {
  const { products, materials, suppliers, equipment, users, departments, inspectionTypes, roles, auditLog } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chart = useChartColors();

  const roleColors: Record<string, string> = {
    Admin:                chart.primaryDark,
    Management:           chart.primary,
    'Production Manager': chart.azure,
    'Stores Manager':     chart.green,
    'Quality Manager':    chart.gold,
    Inspector:            chart.goldHover,
  };

  const pending = equipment.filter((e) => e.calibrationStatus === 'PENDING').length;
  const completed = equipment.filter((e) => e.calibrationStatus === 'COMPLETED').length;

  const usersByRole = roles.map((r) => ({ name: r.name.replace('Manager', 'Mgr.'), count: users.filter((u) => u.roleId === r.id).length, color: roleColors[r.name] || chart.grey })).filter((r) => r.count > 0);

  const calibrationData = [
    { name: 'Completed', value: completed, color: chart.green },
    { name: 'Pending Calibration',   value: pending,   color: chart.amber },
  ];

  const ActionIcon = ({ action }: { action: string }) => {
    if (action === 'Created') return <Plus className="h-3.5 w-3.5 text-success" />;
    if (action === 'Updated') return <Pencil className="h-3.5 w-3.5 text-warning" />;
    return <Trash2 className="h-3.5 w-3.5 text-danger" />;
  };

  return (
    <PageWrapper>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here's what's happening with your quality system today."
      />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Products" value={products.length} icon={Package} to="/admin/products" variant="accent" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Materials" value={materials.length} icon={Layers} to="/admin/materials" variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Suppliers" value={suppliers.length} icon={Factory} to="/admin/suppliers" variant="default" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Pending Calibration" value={pending} icon={AlertTriangle} to="/admin/equipment" variant="warning" /></motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Users" value={users.length} icon={UsersIcon} to="/admin/users" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Departments" value={departments.length} icon={Building} to="/admin/departments" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Inspection Types" value={inspectionTypes.length} icon={ClipboardList} to="/admin/inspection-types" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usersByRole} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...chartGrid} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxisTick} stroke={chartAxisLine} />
                  <YAxis tick={chartAxisTick} stroke={chartAxisLine} allowDecimals={false} />
                  <RTip content={<ChartTooltip />} cursor={barCursor} />
                  <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]} animationDuration={800} maxBarSize={56}>
                    {usersByRole.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calibration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calibrationData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4} cornerRadius={6} stroke="hsl(var(--card))" strokeWidth={2}>
                    {calibrationData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTip content={<ChartTooltip hideLabel />} />
                  <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin -mx-2">
            <ul className="divide-y divide-border">
              {auditLog.slice(0, 15).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3 px-2 hover:bg-muted/40 rounded-md transition-colors cursor-pointer" onClick={() => {
                  const map: Record<string, string> = { Product: '/admin/products', User: '/admin/users', Equipment: '/admin/equipment', Material: '/admin/materials', Department: '/admin/departments', Supplier: '/admin/suppliers', Component: '/admin/components', Document: '/admin/documents', Role: '/admin/roles', Organization: '/admin/organization' };
                  const p = map[a.entityType]; if (p) navigate(p);
                }}>
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0"><ActionIcon action={a.action} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.userName}</span>{' '}
                      <span className="text-muted-foreground">{a.action.toLowerCase()}</span>{' '}
                      <span className="text-muted-foreground">{a.entityType.toLowerCase()}</span>{' '}
                      <span className="font-medium">{a.entityName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
};
