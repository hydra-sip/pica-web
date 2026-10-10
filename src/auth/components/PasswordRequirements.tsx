import React from 'react';
import { validatePasswordRequirements } from '../../shared/validators';

interface PasswordRequirementsProps {
  password: string;
  style?: React.CSSProperties;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password, style }) => {
  const result = validatePasswordRequirements(password);

  const requirements = [
    { label: '8 caracteres o más', met: result.hasMinLength },
    { label: 'Una letra mayúscula', met: result.hasUppercase },
    { label: 'Un número', met: result.hasNumber },
  ];

  return (
    <div
      style={{
        marginTop: '0.45rem',
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.02em',
        }}
      >
        Requisitos de la contraseña:
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {requirements.map((req, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.78rem',
              color: req.met ? '#34d399' : 'var(--text-muted)',
              transition: 'color var(--transition-fast)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: req.met ? 'rgba(52, 211, 153, 0.18)' : 'rgba(148, 163, 184, 0.12)',
                color: req.met ? '#34d399' : 'var(--text-muted)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {req.met ? '✓' : '•'}
            </span>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
