import React, { useState } from 'react';
import { usuarioApi, UsuarioDetalle } from '../../api/usuarioApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { StatusChip } from './StatusChip';

interface EdicionUsuarioModalProps {
  /** El detalle completo: el PUT reemplaza todos los campos, así no se pisa la descripción. */
  usuario: UsuarioDetalle;
  onClose: () => void;
  onGuardado: () => void;
}

/** Edición de la cuenta: usuario, email y descripción. El estado se cambia desde la tabla (bloqueo). */
export const EdicionUsuarioModal: React.FC<EdicionUsuarioModalProps> = ({
  usuario,
  onClose,
  onGuardado,
}) => {
  const [editForm, setEditForm] = useState({
    username: usuario.username,
    email: usuario.email,
    descripcion: usuario.descripcion ?? '',
    estado: (usuario.estado === 'BLOQUEADO' ? 'BLOQUEADO' : 'ACTIVO') as 'ACTIVO' | 'BLOQUEADO',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usuario.protegido) {
      return;
    }

    setIsSavingEdit(true);
    try {
      await usuarioApi.actualizar(usuario.id, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        descripcion: editForm.descripcion.trim() || null,
        estado: editForm.estado,
        personaId: usuario.persona.id,
      });
      onGuardado();
    } catch (err) {
      setEditErrors({
        ...erroresPorCampo(err),
        server: mensajeDeError(err, 'No se pudo guardar el usuario.'),
      });
    } finally {
      setIsSavingEdit(false);
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
        style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Editar Usuario: {usuario.username}
        </h3>

        {editErrors.server && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {editErrors.server}
          </div>
        )}

        <form
          onSubmit={handleEditSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Nombre de Usuario
            </label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
            {editErrors.username && (
              <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                {editErrors.username}
              </span>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
            {editErrors.email && (
              <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                {editErrors.email}
              </span>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Descripción
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={editForm.descripcion}
              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Estado
            </label>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
            >
              <StatusChip status={usuario.estado} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {usuario.estado === 'BLOQUEADO'
                  ? 'Para levantarlo, usá Motivo en la tabla.'
                  : 'Para bloquearlo, usá Bloquear en la tabla: pide motivo y duración.'}
              </span>
            </div>
            {usuario.estado === 'PENDIENTE_VERIFICACION' && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.2rem',
                  display: 'block',
                }}
              >
                Tiene el email sin verificar: pasa a Activo solo cuando lo verifica.
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSavingEdit}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSavingEdit}>
              {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
