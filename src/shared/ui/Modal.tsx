import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  // Mientras se guarda, ni Esc, ni el fondo, ni la cruz cierran el modal
  closeDisabled?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children, footer, size = 'md', closeDisabled = false }) => {
  const tituloId = useId();
  const dialogo = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  const bloqueado = useRef(closeDisabled);
  bloqueado.current = closeDisabled;

  useEffect(() => {
    if (!isOpen) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloqueado.current) cerrar.current();
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-fondo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        ref={dialogo}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <div className="modal-encabezado">
          <h2 id={tituloId} className="modal-titulo">
            {title}
          </h2>
          <button type="button" className="modal-cerrar" aria-label="Cerrar" onClick={onClose} disabled={closeDisabled}>
            &times;
          </button>
        </div>
        {children}
        {footer && <div className="modal-pie">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
