import React from 'react';
import Card from '../../components/Card';
import { FileText } from 'lucide-react';

const ReportsPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Forensic & Traffic Reports"
        subtitle="Generate and download PDF and CSV audit logs."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <FileText size={24} color="var(--amber)" />
          <span>Report generation forms and download history will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPlaceholder;
