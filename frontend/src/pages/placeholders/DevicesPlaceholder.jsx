import React from 'react';
import Card from '../../components/Card';
import { HardDrive } from 'lucide-react';

const DevicesPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Network Devices Inventory"
        subtitle="Discovered network hosts, MAC addresses, and risk profiling."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <HardDrive size={24} color="var(--violet)" />
          <span>Device inventory table and risk scoring will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default DevicesPlaceholder;
