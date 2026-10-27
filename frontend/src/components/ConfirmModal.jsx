import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  loading = false,
}) => {
  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="btn btn-secondary"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
      >
        {loading ? 'Processing...' : confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="440px"
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '8px 0' }}>
        {isDanger && (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 92, 122, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color="var(--red)" />
          </div>
        )}
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.55 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
