import React from 'react';
import Card from '../../components/Card';
import { Users } from 'lucide-react';

const UsersPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="User Access Management (Admin)"
        subtitle="Manage operators, roles, and security credentials."
      >
        <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-dim)' }}>
          <Users size={24} color="var(--cyan)" />
          <span>User account creation, role changes, and deletion will be integrated in Phase 9.</span>
        </div>
      </Card>
    </div>
  );
};

export default UsersPlaceholder;
