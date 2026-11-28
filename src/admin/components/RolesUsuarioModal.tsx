import React, { useState } from 'react';
import { usuarioApi, UsuarioResumen } from '../../api/usuarioApi';
import { RolResumen } from '../../api/rolApi';
import { mensajeDeError } from '../../shared/mensajesError';

interface RolesUsuarioModalProps {
  usuario: UsuarioResumen;
  roles: RolResumen[];
  onClose: () => void;
  onGuardado: () => void;
}

/** Los roles del usuario, por id. Un rol inactivo no se puede sumar, pero si ya lo tenía se conserva. */
export const RolesUsuarioModal: React.FC<RolesUsuarioModalProps> = ({
  usuario,
  roles,
  onClose,
  onGuardado,
}) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(usuario.roles.map((r) => r.id));
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [rolesMessage, setRolesMessage] = useState<string | null>(null);

  // Save Roles via PUT /admin/usuarios/{id}/roles (numeric IDs payload { roles: [number] })
  const handleSaveRoles = async () => {
    setIsSavingRoles(true);
    setRolesMessage(null);

    try {
      await usuarioApi.updateRoles(usuario.id, selectedRoleIds);
      setRolesMessage('¡Roles asignados exitosamente!');
      setTimeout(onGuardado, 1000);
    } catch (err) {
      setRolesMessage(mensajeDeError(err, 'No se pudieron guardar los roles.'));
    } finally {
      setIsSavingRoles(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-overlay)',
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
        className="card"
        style={{ width: '100%', maxWidth: '520px', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Asignación de Roles</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Usuario: <strong>{usuario.username}</strong> ({usuario.email})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Llama a <code>PUT /admin/usuarios/{usuario.id}/roles</code> enviando array de IDs
          numéricos <code>{`{ roles: [number] }`}</code>.
        </p>

        {rolesMessage && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              backgroundColor: rolesMessage.includes('exitosamente')
                ? 'var(--color-success-bg)'
                : 'var(--color-danger-bg)',
              color: rolesMessage.includes('exitosamente')
                ? 'var(--color-success)'
                : 'var(--color-danger)',
              border: rolesMessage.includes('exitosamente')
                ? '1px solid var(--color-success-border)'
                : '1px solid var(--color-danger-border)',
            }}
          >
            {rolesMessage}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {roles.map((r) => {
            const isChecked = selectedRoleIds.includes(r.id);
            // Un rol inactivo no se puede agregar (409 ROL_INACTIVO); si ya lo tenía, se conserva
            const bloqueado = r.estado === 'INACTIVO' && !usuario.roles.some((x) => x.id === r.id);
            return (
              <label
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isChecked ? 'var(--color-surface)' : 'var(--color-surface)',
                  border: isChecked
                    ? '1px solid var(--color-border-strong)'
                    : '1px solid var(--color-border)',
                  cursor: bloqueado ? 'not-allowed' : 'pointer',
                  opacity: bloqueado ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={bloqueado}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoleIds([...selectedRoleIds, r.id]);
                    } else {
                      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== r.id));
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--color-primary)',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    {r.nombreAmigable}{' '}
                    <code>
                      (ID: {r.id}, {r.nombre})
                    </code>
                    {r.estado === 'INACTIVO' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                        {' '}
                        · inactivo
                      </span>
                    )}
                  </div>
                  {r.descripcion && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {r.descripcion}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSavingRoles}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveRoles}
            disabled={isSavingRoles}
          >
            {isSavingRoles ? 'Guardando...' : 'Guardar Roles'}
          </button>
        </div>
      </div>
    </div>
  );
};
