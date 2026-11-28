import React from 'react';
import { RolResumen } from '../../api/rolApi';

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  fontSize: '0.85rem',
  outline: 'none',
  cursor: 'pointer',
};

interface UsuariosFiltroRolProps {
  rolId: number;
  roles: RolResumen[];
  onChange: (rolId: number) => void;
}

/** El filtro por rol del listado de usuarios: 0 es «Todos». */
export const UsuariosFiltroRol: React.FC<UsuariosFiltroRolProps> = ({ rolId, roles, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <span style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
      Rol:
    </span>
    <select value={rolId} onChange={(e) => onChange(Number(e.target.value))} style={selectStyle}>
      <option value={0}>Todos</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.nombreAmigable}
        </option>
      ))}
    </select>
  </div>
);
