import React from 'react';
import { DataTable, ColumnDef } from './DataTable';
import { UsuarioResumen } from '../../api/usuarioApi';
import { Badge, Button } from '../../shared/ui';
import { UsuariosAdmin } from '../hooks/useUsuariosAdmin';
import { UsuariosFiltroRol } from './UsuariosFiltroRol';

// Estados de usuario del contrato; la baja lógica va aparte, con incluirEliminados
const ESTADOS_USUARIO = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'PENDIENTE_VERIFICACION', label: 'Pendientes' },
  { value: 'BLOQUEADO', label: 'Bloqueados' },
  { value: 'ELIMINADO', label: 'Eliminados' },
];

interface UsuariosTablaProps {
  listado: UsuariosAdmin;
  /** El usuario de la sesión: no se da de baja, ni se bloquea, ni se resetea la clave a sí mismo. */
  esYo: (u: UsuarioResumen) => boolean;
  puedeEditar: boolean;
  puedeBloquear: boolean;
  puedeAsignarRoles: boolean;
  /** Sin permiso, el callback no viene y la tabla no muestra la acción. */
  onCrear?: () => void;
  onEditar?: (u: UsuarioResumen) => void;
  onEliminar?: (u: UsuarioResumen) => void;
  onReactivar?: (u: UsuarioResumen) => void;
  onRoles: (u: UsuarioResumen) => void;
  onResetear: (u: UsuarioResumen) => void;
  onBloquear: (u: UsuarioResumen) => void;
  onVerMotivo: (u: UsuarioResumen) => void;
}

/** El listado de cuentas del backoffice, paginado en el servidor, con sus filtros y las acciones de cada fila. */
export const UsuariosTabla: React.FC<UsuariosTablaProps> = ({
  listado,
  esYo,
  puedeEditar,
  puedeBloquear,
  puedeAsignarRoles,
  onCrear,
  onEditar,
  onEliminar,
  onReactivar,
  onRoles,
  onResetear,
  onBloquear,
  onVerMotivo,
}) => {
  // Columnas del wireframe EP01.RF005_EP08.RF062: persona e identidad, documento, roles y estado
  const columns: ColumnDef<UsuarioResumen>[] = [
    {
      key: 'persona',
      label: 'Persona / identidad',
      sortable: true,
      render: (u) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
            }}
          >
            {u.persona?.nombreCompleto || u.username}
            {u.protegido && <Badge tone="aviso">Admin del sistema</Badge>}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            @{u.username}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {u.email}
          </div>
        </div>
      ),
    },
    {
      key: 'documento',
      label: 'Documento',
      render: (u) =>
        u.persona?.nroDoc ? (
          <span style={{ whiteSpace: 'nowrap' }}>
            {u.persona.tipoDoc || 'DOC'} {u.persona.nroDoc}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (u) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {u.roles.length === 0
            ? '-'
            : u.roles.map((r) => (
                <Badge key={r.id} tone={r.nombre === 'ORGANIZADOR' ? 'solido' : 'borde'}>
                  {r.nombreAmigable || r.nombre}
                </Badge>
              ))}
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  // Custom Row Actions: Roles & Password Reset (un usuario dado de baja primero se reactiva)
  const renderCustomRowActions = (user: UsuarioResumen) => {
    if (user.eliminado) return null;
    return (
      <>
        {puedeAsignarRoles && (
          <Button
            size="sm"
            variant="secondary"
            title="Gestionar Roles (PUT /admin/usuarios/{id}/roles)"
            onClick={() => onRoles(user)}
            disabled={user.protegido}
          >
            Roles
          </Button>
        )}

        {puedeEditar && (
          <Button
            size="sm"
            variant="secondary"
            title={
              esYo(user)
                ? 'Tu contraseña se cambia desde Mi perfil'
                : 'Resetear Contraseña (PUT /admin/usuarios/{id}/password)'
            }
            onClick={() => {
              if (user.protegido || esYo(user)) {
                return;
              }
              onResetear(user);
            }}
            disabled={user.protegido || esYo(user)}
          >
            Reset
          </Button>
        )}

        {user.estado === 'BLOQUEADO' ? (
          <Button
            size="sm"
            variant="secondary"
            title="Ver el motivo y la duración"
            onClick={() => onVerMotivo(user)}
          >
            Motivo
          </Button>
        ) : (
          puedeBloquear && (
            <Button
              size="sm"
              variant="danger"
              title={
                esYo(user) ? 'No podés bloquearte a vos mismo' : 'Bloquear con motivo y duración'
              }
              onClick={() => onBloquear(user)}
              disabled={user.protegido || esYo(user)}
            >
              Bloquear
            </Button>
          )
        )}
      </>
    );
  };

  return (
    <DataTable<UsuarioResumen>
      title="Listado de cuentas"
      description="Buscá por usuario, email, apellido o documento, y filtrá por rol o estado."
      data={listado.usuarios}
      columns={columns}
      searchFields={['username', 'email']}
      statusField="estado"
      idField="id"
      isLoading={listado.isLoading}
      serverSide
      page={listado.page}
      pageSize={listado.pageSize}
      totalElements={listado.totalElements}
      totalPages={listado.totalPages}
      onPageChange={listado.cambiarPagina}
      onPageSizeChange={listado.cambiarTamanio}
      onSearchChange={listado.buscar}
      onStatusFilterChange={listado.filtrarPorEstado}
      onSortChange={listado.ordenar}
      statusOptions={ESTADOS_USUARIO}
      extraFilters={
        <UsuariosFiltroRol
          rolId={listado.rolFilter}
          roles={listado.availableRoles}
          onChange={listado.filtrarPorRol}
        />
      }
      onCreate={onCrear}
      onEdit={onEditar}
      onDelete={onEliminar}
      onReactivate={onReactivar}
      customActions={renderCustomRowActions}
      isReadOnly={(u) => u.protegido}
      canDelete={(u) => !esYo(u)}
      createButtonText="Crear usuario"
    />
  );
};
