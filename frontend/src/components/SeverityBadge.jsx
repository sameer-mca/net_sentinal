import React from 'react';

const SeverityBadge = ({ severity }) => {
  const sev = (severity || 'low').toLowerCase();
  let badgeClass = 'badge-low';
  let label = 'Low';

  if (sev === 'critical') {
    badgeClass = 'badge-critical';
    label = 'Critical';
  } else if (sev === 'high') {
    badgeClass = 'badge-high';
    label = 'High';
  } else if (sev === 'medium') {
    badgeClass = 'badge-medium';
    label = 'Medium';
  } else if (sev === 'low') {
    badgeClass = 'badge-low';
    label = 'Low';
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
};

export default SeverityBadge;
