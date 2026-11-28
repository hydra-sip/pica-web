import React, { useState } from 'react';
import { usuarioApi, UsuarioResumen, UsuarioDetalle } from '../../api/usuarioApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { mensajeDeError } from '../../shared/mensajesError';
import { BloqueoModal } from '../components/BloqueoModal';
import { MotivoBloqueoModal } from '../components/MotivoBloqueoModal';
import { IconoCruz } from '../../shared/ui/Iconos';
import { useUsuariosAdmin } from '../hooks/useUsuariosAdmin';
import { UsuariosTabla } from '../components/UsuariosTabla';
import { AltaUsuarioModal } from '../components/AltaUsuarioModal';
import { EdicionUsuarioModal } from '../components/EdicionUsuarioModal';
import { RolesUsuarioModal } from '../components/RolesUsuarioModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';

/**
 * Usuarios y roles del backoffice: el listado (useUsuariosAdmin + UsuariosTabla) y los modales de alta, edición,
 * roles, reseteo de clave y bloqueo. Cada acción se muestra según el permiso.
 */
export const UsuariosPage: React.FC = () => {
  const { hasPermission, user: usuarioLogueado } = useAuth();
  // CE2-1: nadie se da de baja, se bloquea ni se resetea la clave a sí mismo (el back responde 403
  // ACCION_SOBRE_SI_MISMO); la clave propia se cambia desde Mi perfil
  const esYo = (u: { id: number | string }) =>
    usuarioLogueado != null && String(usuarioLogueado.id) === String(u.id);
  const puedeCrear = hasPermission('USUARIO_CREAR');
  const puedeEditar = hasPermission('USUARIO_EDITAR');
  // HU-703: bloquear tiene permiso propio, así soporte sanciona sin poder editar cuentas
  const puedeBloquear = hasPermission('USUARIO_BLOQUEAR');
  const puedeEliminar = hasPermission('USUARIO_ELIMINAR');
  const puedeAsignarRoles = hasPermission('ROL_ASIGNAR');
  const puedeCrearPersona = hasPermission('PERSONA_CREAR');

  const listado = useUsuariosAdmin();
  const { recargar } = listado;
  const [aviso, setAviso] = useState<string | null>(null);

  // Un modal abierto a la vez por tipo; cada uno arranca de cero al abrirse
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioDetalle | null>(null);
  const [rolesModalUser, setRolesModalUser] = useState<UsuarioResumen | null>(null);
  const [resetPassUser, setResetPassUser] = useState<UsuarioResumen | null>(null);
  // Bloqueo con motivo y duración, y el detalle del bloqueo vigente
  const [aBloquear, setABloquear] = useState<UsuarioResumen | null>(null);
  const [motivoDe, setMotivoDe] = useState<UsuarioResumen | null>(null);

  // Open Edit: trae el detalle para no pisar la descripción al guardar
  const handleOpenEdit = async (u: UsuarioResumen) => {
    if (u.protegido) {
      return;
    }
    try {
      setEditingUser(await usuarioApi.getUsuario(u.id));
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo abrir el usuario.'));
    }
  };

  // Handle Soft-Delete
  const handleDeleteUser = async (user: UsuarioResumen) => {
    if (user.protegido || esYo(user)) {
      return;
    }
    try {
      await usuarioApi.eliminar(user.id);
      recargar();
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo dar de baja el usuario.'));
    }
  };

  // Handle Reactivate User
  const handleReactivateUser = async (user: UsuarioResumen) => {
    try {
      await usuarioApi.reactivar(user.id);
      recargar();
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo reactivar el usuario.'));
    }
  };

  const handleOpenRoles = (user: UsuarioResumen) => {
    if (user.protegido) {
      return;
    }
    setRolesModalUser(user);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0 }}>Usuarios y roles</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
          Cuentas, roles, bloqueos y reseteo de claves.
        </p>
      </div>

      {aviso && (
        <div
          role="alert"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span>{aviso}</span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconoCruz size={14} />
          </button>
        </div>
      )}

      <UsuariosTabla
        listado={listado}
        esYo={esYo}
        puedeEditar={puedeEditar}
        puedeBloquear={puedeBloquear}
        puedeAsignarRoles={puedeAsignarRoles}
        onCrear={puedeCrear ? () => setIsCreateOpen(true) : undefined}
        onEditar={puedeEditar ? handleOpenEdit : undefined}
        onEliminar={puedeEliminar ? handleDeleteUser : undefined}
        onReactivar={puedeEliminar ? handleReactivateUser : undefined}
        onRoles={handleOpenRoles}
        onResetear={setResetPassUser}
        onBloquear={setABloquear}
        onVerMotivo={setMotivoDe}
      />

      <BloqueoModal usuario={aBloquear} onClose={() => setABloquear(null)} onBloqueado={recargar} />
      <MotivoBloqueoModal
        usuario={motivoDe}
        puedeLevantar={puedeBloquear}
        onClose={() => setMotivoDe(null)}
        onLevantado={recargar}
      />

      {isCreateOpen && (
        <AltaUsuarioModal
          roles={listado.availableRoles}
          puedeCrearPersona={puedeCrearPersona}
          onClose={() => setIsCreateOpen(false)}
          onCreado={() => {
            setIsCreateOpen(false);
            recargar();
          }}
        />
      )}

      {editingUser && (
        <EdicionUsuarioModal
          key={editingUser.id}
          usuario={editingUser}
          onClose={() => setEditingUser(null)}
          onGuardado={() => {
            setEditingUser(null);
            recargar();
          }}
        />
      )}

      {rolesModalUser && (
        <RolesUsuarioModal
          key={rolesModalUser.id}
          usuario={rolesModalUser}
          roles={listado.availableRoles}
          onClose={() => setRolesModalUser(null)}
          onGuardado={() => {
            setRolesModalUser(null);
            recargar();
          }}
        />
      )}

      {resetPassUser && (
        <ResetPasswordModal
          key={resetPassUser.id}
          usuario={resetPassUser}
          onClose={() => setResetPassUser(null)}
        />
      )}
    </div>
  );
};
