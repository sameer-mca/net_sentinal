import React from 'react';
import Card from '../../components/Card';
import { LayoutDashboard } from 'lucide-react';

const DashboardPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Dashboard Overview"
        subtitle="Real-time network traffic KPIs, protocol distribution, and threat summary."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <LayoutDashboard size={24} color="var(--cyan)" />
          <span>Dashboard widgets and charts will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPlaceholder;
