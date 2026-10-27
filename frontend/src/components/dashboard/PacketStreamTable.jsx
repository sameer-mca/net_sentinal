import React, { useState } from 'react';
import Card from '../Card';
import { formatTime } from '../../utils/format';
import { Play, Pause, AlertTriangle, ShieldAlert, Search } from 'lucide-react';

const PROTO_COLORS = {
  TCP: 'var(--cyan)',
  UDP: 'var(--violet)',
  ICMP: 'var(--magenta)',
  DNS: 'var(--green)',
  OTHER: 'var(--amber)',
};

const PacketStreamTable = ({ packets = [], isPaused, onTogglePause }) => {
  const [ipFilter, setIpFilter] = useState('');
  const [protoFilter, setProtoFilter] = useState('ALL');

  const filteredPackets = packets.filter((pkt) => {
    if (protoFilter !== 'ALL' && pkt.protocol !== protoFilter) {
      return false;
    }
    if (ipFilter.trim()) {
      const q = ipFilter.trim().toLowerCase();
      const matchSrc = pkt.src_ip && pkt.src_ip.toLowerCase().includes(q);
      const matchDst = pkt.dst_ip && pkt.dst_ip.toLowerCase().includes(q);
      if (!matchSrc && !matchDst) return false;
    }
    return true;
  });

  const filterControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* IP Filter Input */}
      <div
        className="clay-inset"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
        }}
      >
        <Search size={13} color="var(--text-faint)" />
        <input
          type="text"
          placeholder="Filter IP..."
          value={ipFilter}
          onChange={(e) => setIpFilter(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '12px',
            color: 'var(--text)',
            width: '110px',
            fontFamily: 'var(--font-mono)',
          }}
        />
      </div>

      {/* Protocol Filter Dropdown */}
      <select
        className="clay-inset"
        value={protoFilter}
        onChange={(e) => setProtoFilter(e.target.value)}
        style={{
          padding: '4px 10px',
          fontSize: '12px',
          borderRadius: '999px',
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        <option value="ALL">All Protocols</option>
        <option value="TCP">TCP</option>
        <option value="UDP">UDP</option>
        <option value="ICMP">ICMP</option>
        <option value="DNS">DNS</option>
        <option value="OTHER">OTHER</option>
      </select>

      {/* Pause/Resume Pill Button */}
      <button
        type="button"
        onClick={onTogglePause}
        className={`btn ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isPaused ? (
          <>
            <Play size={12} fill="currentColor" />
            <span>Resume</span>
            <span
              className="badge badge-medium"
              style={{ fontSize: '9px', padding: '1px 6px', marginLeft: '4px' }}
            >
              PAUSED
            </span>
          </>
        ) : (
          <>
            <Pause size={12} fill="currentColor" />
            <span>Pause Stream</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Card
      title="Real-Time Packet Stream"
      subtitle={`Live wire inspection feed (${packets.length} buffered${isPaused ? ' - PAUSED' : ''})`}
      action={filterControls}
      className="col-span-3"
      style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}
    >
      <div className="table-responsive table-fade-mask" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Time</th>
              <th>Source IP</th>
              <th>Destination IP</th>
              <th style={{ width: '95px' }}>Protocol</th>
              <th>Ports</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-faint)' }}>
                  {packets.length === 0
                    ? 'Waiting for packets… start the capture engine.'
                    : 'No packets match the current filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredPackets.map((pkt, idx) => {
                const isSuspicious = pkt.status === 'suspicious';
                const protoColor = PROTO_COLORS[pkt.protocol] || 'var(--text-dim)';

                const portDisplay =
                  pkt.src_port || pkt.dst_port ? (
                    <span>
                      <span>{pkt.src_port ?? '-'}</span>
                      <span style={{ color: 'var(--text-faint)', margin: '0 4px' }}>→</span>
                      <span>{pkt.dst_port ?? '-'}</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-faint)' }}>-</span>
                  );

                return (
                  <tr
                    key={idx}
                    className={`${isSuspicious ? 'row-suspicious' : ''} ${idx === 0 ? 'row-new' : ''}`}
                  >
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      {formatTime(pkt.timestamp)}
                    </td>
                    <td className="font-mono" style={{ color: isSuspicious ? 'var(--red)' : 'var(--cyan)' }}>
                      {isSuspicious && (
                        <ShieldAlert
                          size={13}
                          color="var(--red)"
                          style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}
                        />
                      )}
                      {pkt.src_ip}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--text)' }}>
                      {pkt.dst_ip}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          background: `rgba(255, 255, 255, 0.04)`,
                          color: protoColor,
                          border: `1px solid ${protoColor}40`,
                        }}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                      {portDisplay}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '11.5px' }}>
                      {pkt.packet_size} B
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PacketStreamTable;
