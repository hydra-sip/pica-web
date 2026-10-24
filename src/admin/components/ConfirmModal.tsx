import React from 'react';
import { Button, Modal } from '../../shared/ui';

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
}) => (
  <Modal
    isOpen={isOpen}
    title={title}
    onClose={onClose}
    size="sm"
    closeDisabled={isLoading}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={isLoading}>
          {isLoading ? 'Procesando...' : confirmText}
        </Button>
      </>
    }
  >
    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)' }}>{message}</p>
  </Modal>
);
