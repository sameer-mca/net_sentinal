import React from 'react';
import Card from '../../components/Card';
import { Activity } from 'lucide-react';

const TrafficPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Live Traffic Monitor"
        subtitle="Real-time network packet feed and protocol analysis."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <Activity size={24} color="var(--green)" />
          <span>Real-time packet table and filter controls will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default TrafficPlaceholder;
