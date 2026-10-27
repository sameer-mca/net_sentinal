import React from 'react';
import Card from '../../components/Card';
import { Sliders } from 'lucide-react';

const RulesPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Detection Rules Engine (Admin)"
        subtitle="Configure thresholds, sliding windows, and severity levels for detection rules."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <Sliders size={24} color="var(--magenta)" />
          <span>Rule threshold management and activation switches will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default RulesPlaceholder;
