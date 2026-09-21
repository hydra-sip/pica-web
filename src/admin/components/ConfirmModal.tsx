import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getButtonBg = () => {
    if (variant === 'danger') return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    if (variant === 'warning') return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    return 'var(--accent-gradient)';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor:
                variant === 'danger'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : variant === 'warning'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(99, 102, 241, 0.2)',
              color: variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            {variant === 'danger' || variant === 'warning' ? '⚠️' : 'ℹ️'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: getButtonBg(),
              color: '#fff',
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
