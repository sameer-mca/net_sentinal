import React from 'react';
import Card from '../../components/Card';
import { AlertTriangle } from 'lucide-react';

const AlertsPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Intrusion Detection Alerts"
        subtitle="Security events, attack signatures, and severity classification."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <AlertTriangle size={24} color="var(--sev-high)" />
          <span>Interactive alert management and resolution workflow will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default AlertsPlaceholder;
