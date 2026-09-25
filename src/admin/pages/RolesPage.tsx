import React, { useState, useEffect, useCallback } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';
import { rolApi, RolResumen, RolDetalle, ModuloPermisosApi } from '../../api/rolApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { mensajeDeError } from '../mensajesError';

export interface PermisoItem {
  id: string;
  label: string;
}

export interface ModuloPermisos {
  modulo: string;
  icono: string;
  permisos: PermisoItem[];
}

// Solo presentación: los módulos y permisos salen de GET /admin/permisos
const MODULO_UI: Record<ModuloPermisosApi['modulo'], { modulo: string; icono: string }> = {
  USUARIOS: { modulo: 'Módulo Usuarios', icono: '👥' },
  ROLES: { modulo: 'Módulo Roles y Seguridad', icono: '🛡️' },
  PERSONAS: { modulo: 'Módulo Personas y Padrón', icono: '📇' },
};

const aModulosUi = (catalogo: ModuloPermisosApi[]): ModuloPermisos[] =>
  catalogo.map((m) => ({
    ...(MODULO_UI[m.modulo] ?? { modulo: m.modulo, icono: '🔑' }),
    permisos: m.permisos.map((p) => ({ id: p.codigo, label: p.descripcion })),
  }));

// SUPER_USUARIO tiene todos los permisos y el back no deja cambiárselos (403 ROL_PROTEGIDO)
const esSuperUsuario = (rol: RolResumen) => rol.esSistema && rol.nombre === 'SUPER_USUARIO';

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const puedeCrear = hasPermission('ROL_CREAR');
  const puedeEditar = hasPermission('ROL_EDITAR');
  const puedeEliminar = hasPermission('ROL_ELIMINAR');

  const [roles, setRoles] = useState<RolResumen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [modulosPermisos, setModulosPermisos] = useState<ModuloPermisos[]>([]);

  // Pagination & Server Control
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [sortParam, setSortParam] = useState('id,asc');

  // Fetch Roles from API
  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await rolApi.getRoles({
        q: searchTerm || undefined,
        // ELIMINADO no es un estado del contrato: se pide con incluirEliminados
        estado: statusFilter !== 'TODOS' && statusFilter !== 'ELIMINADO' ? statusFilter : undefined,
        incluirEliminados: statusFilter === 'ELIMINADO' || statusFilter === 'TODOS',
        page: page - 1,
        size: pageSize,
        sort: sortParam,
      });

      setRoles(res.content || []);
      setTotalElements(res.page?.totalElements || res.content.length);
      setTotalPages(res.page?.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar roles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, page, pageSize, sortParam]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    rolApi
      .getPermisosCatalogo()
      .then((catalogo) => setModulosPermisos(aModulosUi(catalogo)))
      .catch(() => setAviso('No se pudo cargar el catálogo de permisos.'));
  }, []);

  // Form Modal State (Crear / Editar Rol)
  const [formModalState, setFormModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedRol?: Partial<RolResumen>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  // Permisos Modal State (PUT /admin/roles/{id}/permisos)
  const [permisosModalRol, setPermisosModalRol] = useState<RolDetalle | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
  const [isSavingPermisos, setIsSavingPermisos] = useState(false);
  const [permisosFeedback, setPermisosFeedback] = useState<string | null>(null);

  // Columns for DataTable
  const columns: ColumnDef<RolResumen>[] = [
    {
      key: 'nombre',
      label: 'Código de Rol',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <code>{r.nombre}</code>
            {r.esSistema && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                🔒 Rol del Sistema
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'nombreAmigable',
      label: 'Nombre Display',
      sortable: true,
      render: (r) => <strong style={{ color: 'var(--text-primary)' }}>{r.nombreAmigable}</strong>,
    },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'cantidadUsuarios',
      label: 'Usuarios Asignados',
      render: (r) => (
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-secondary)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          {r.cantidadUsuarios ?? 0} usuarios
        </span>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  const formFields: FormFieldSchema[] = [
    {
      name: 'nombre',
      label: 'Código Identificador del Rol',
      required: true,
      placeholder: 'ej. VEEDOR',
      readOnlyInEdit: true,
      validate: (val) => {
        if (val && !/^[A-Z][A-Z0-9_]{2,49}$/.test(String(val))) {
          return 'El código debe comenzar en mayúscula y contener solo letras mayúsculas, números y guiones bajos (ej. VEEDOR).';
        }
        return null;
      },
    },
    {
      name: 'nombreAmigable',
      label: 'Nombre Display (Amigable)',
      required: true,
      placeholder: 'ej. Veedor Institucional',
    },
    {
      name: 'descripcion',
      label: 'Descripción de Alcance',
      type: 'textarea',
      placeholder: 'Describa el propósito y alcance del rol...',
    },
    {
      name: 'estado',
      label: 'Estado del Rol',
      type: 'select',
      required: true,
      options: [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' },
      ],
    },
  ];

  // Actions for Create, View, Edit, Delete, Reactivate
  const handleCreate = () => {
    setFormModalState({
      isOpen: true,
      mode: 'create',
      selectedRol: { estado: 'ACTIVO' },
    });
  };

  const handleView = async (rol: RolResumen) => {
    try {
      const detail = await rolApi.getRol(rol.id);
      setFormModalState({
        isOpen: true,
        mode: 'view',
        selectedRol: detail,
      });
    } catch {
      setFormModalState({
        isOpen: true,
        mode: 'view',
        selectedRol: rol,
      });
    }
  };

  const handleEdit = (rol: RolResumen) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      selectedRol: rol,
    });
  };

  const handleDelete = async (rol: RolResumen) => {
    try {
      await rolApi.eliminar(rol.id);
      fetchRoles();
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo dar de baja el rol.'));
    }
  };

  const handleReactivate = async (rol: RolResumen) => {
    try {
      await rolApi.reactivar(rol.id);
      fetchRoles();
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo reactivar el rol.'));
    }
  };

  const handleSubmitForm = async (formData: Partial<RolResumen>) => {
    if (formModalState.mode === 'create') {
      await rolApi.crear({
        nombre: (formData.nombre || '').toUpperCase().trim(),
        nombreAmigable: formData.nombreAmigable || '',
        descripcion: formData.descripcion || null,
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO') || 'ACTIVO',
      });
    } else if (formModalState.mode === 'edit' && formModalState.selectedRol?.id) {
      await rolApi.actualizar(formModalState.selectedRol.id, {
        nombre: formModalState.selectedRol.nombre || '',
        nombreAmigable: formData.nombreAmigable || formModalState.selectedRol.nombreAmigable || '',
        descripcion: formData.descripcion || null,
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO') || formModalState.selectedRol.estado || 'ACTIVO',
      });
    }
    setFormModalState({ isOpen: false, mode: 'create' });
    fetchRoles();
  };

  // Open Permisos Modal (fetches full RolDetalle with permisos list)
  const handleOpenPermisos = async (rol: RolResumen) => {
    if (esSuperUsuario(rol)) {
      return;
    }
    try {
      const detail = await rolApi.getRol(rol.id);
      setPermisosModalRol(detail);
      setSelectedPermisos(detail.permisos || []);
      setPermisosFeedback(null);
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudieron cargar los permisos del rol.'));
    }
  };

  // Quick Action: Select Only Read-Only Permisos (*_VER)
  const handleSelectReadOnlyPermisos = () => {
    setSelectedPermisos(
      modulosPermisos.flatMap((m) => m.permisos.map((p) => p.id)).filter((id) => id.endsWith('_VER'))
    );
  };

  // Quick Action: Select All Permisos
  const handleSelectAllPermisos = () => {
    const all = modulosPermisos.flatMap((m) => m.permisos.map((p) => p.id));
    setSelectedPermisos(all);
  };

  // Quick Action: Clear All Permisos
  const handleClearAllPermisos = () => {
    setSelectedPermisos([]);
  };

  // Save Permisos via PUT /admin/roles/{id}/permisos
  const handleSavePermisos = async () => {
    if (!permisosModalRol) return;
    setIsSavingPermisos(true);
    setPermisosFeedback(null);

    try {
      await rolApi.updatePermisos(permisosModalRol.id, selectedPermisos);
      setPermisosFeedback('¡Matriz de permisos guardada exitosamente!');
      setTimeout(() => {
        setPermisosModalRol(null);
        fetchRoles();
      }, 1200);
    } catch (err) {
      setPermisosFeedback(mensajeDeError(err, 'No se pudieron guardar los permisos.'));
    } finally {
      setIsSavingPermisos(false);
    }
  };

  // Render Custom Action: "🔑 Permisos" button
  // Dado de baja: primero se reactiva (404). Inactivo: el back no deja cambiarle permisos (409 ROL_INACTIVO)
  const renderCustomActions = (rol: RolResumen) => {
    if (!puedeEditar || rol.eliminado) return null;
    const apagado = esSuperUsuario(rol) || rol.estado === 'INACTIVO';
    return (
      <button
        type="button"
        title={
          rol.estado === 'INACTIVO'
            ? 'Rol inactivo: activalo para cambiar sus permisos'
            : 'Configurar matriz de permisos (PUT /admin/roles/{id}/permisos)'
        }
        onClick={() => handleOpenPermisos(rol)}
        disabled={apagado}
        style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: 'var(--accent-primary)',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: apagado ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          opacity: apagado ? 0.5 : 1,
        }}
      >
        🔑 Permisos
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: ROL_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Roles y Permisos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Definición de roles del sistema y matriz de permisos por módulos conectada al backend REST.
        </p>
      </div>

      {aviso && (
        <div
          role="alert"
          style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}
        >
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      <DataTable<RolResumen>
        title="Matriz de Roles y Permisos"
        description="Gestión centralizada de perfiles de acceso. Los roles del sistema (esSistema: true) se mantienen en sólo lectura."
        data={roles}
        columns={columns}
        searchFields={['nombre', 'nombreAmigable', 'descripcion']}
        statusField="estado"
        idField="id"
        isLoading={isLoading}
        serverSide
        page={page}
        pageSize={pageSize}
        totalElements={totalElements}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setPage(1);
        }}
        onStatusFilterChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        onSortChange={(col, dir) => {
          if (col) setSortParam(`${col},${dir}`);
          else setSortParam('id,asc');
        }}
        onCreate={puedeCrear ? handleCreate : undefined}
        onView={handleView}
        onEdit={puedeEditar ? handleEdit : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onReactivate={puedeEliminar ? handleReactivate : undefined}
        customActions={renderCustomActions}
        isReadOnly={(rol) => rol.esSistema}
        createButtonText="Crear Nuevo Rol"
      />

      {/* Form Modal for Create / Edit Rol */}
      <FormModal<RolResumen>
        isOpen={formModalState.isOpen}
        title={
          formModalState.mode === 'create'
            ? 'Crear Nuevo Rol'
            : formModalState.mode === 'edit'
            ? `Editar Rol ${formModalState.selectedRol?.nombreAmigable}`
            : `Detalles del Rol ${formModalState.selectedRol?.nombreAmigable}`
        }
        mode={formModalState.mode}
        fields={formFields}
        initialData={formModalState.selectedRol}
        onClose={() => setFormModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmitForm}
      />

      {/* MODAL PERMISOS AGRUPADOS POR MÓDULO (PUT /admin/roles/{id}/permisos) */}
      {permisosModalRol && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setPermisosModalRol(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Configuración de Permisos</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Rol: <strong>{permisosModalRol.nombreAmigable}</strong> (<code>{permisosModalRol.nombre}</code>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermisosModalRol(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Los cambios se guardan invocando a <code>PUT /admin/roles/{permisosModalRol.id}/permisos</code> con la lista de permisos seleccionados.
            </p>

            {/* Quick Actions Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
                Acciones Rápidas:
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSelectReadOnlyPermisos}
                style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-secondary)' }}
              >
                ⚡ Seleccionar sólo lectura (*_VER)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSelectAllPermisos}
                style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
              >
                ✓ Seleccionar todo
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearAllPermisos}
                style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
              >
                ✕ Desmarcar todo
              </button>
            </div>

            {permisosFeedback && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  backgroundColor: permisosFeedback.includes('exitosamente') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: permisosFeedback.includes('exitosamente') ? '#10b981' : '#f87171',
                  border: permisosFeedback.includes('exitosamente') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {permisosFeedback}
              </div>
            )}

            {/* Módulos de Permisos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {modulosPermisos.map((mod) => {
                const modPermisoIds = mod.permisos.map((p) => p.id);
                const allModSelected = modPermisoIds.every((id) => selectedPermisos.includes(id));

                const toggleModule = (checked: boolean) => {
                  if (checked) {
                    const union = Array.from(new Set([...selectedPermisos, ...modPermisoIds]));
                    setSelectedPermisos(union);
                  } else {
                    setSelectedPermisos(selectedPermisos.filter((id) => !modPermisoIds.includes(id)));
                  }
                };

                return (
                  <div
                    key={mod.modulo}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '0.5rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{mod.icono}</span>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{mod.modulo}</h4>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.775rem', color: 'var(--accent-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={allModSelected}
                          onChange={(e) => toggleModule(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        Seleccionar módulo
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem' }}>
                      {mod.permisos.map((perm) => {
                        const isChecked = selectedPermisos.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.6rem',
                              padding: '0.5rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.3)',
                              border: isChecked ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                              cursor: 'pointer',
                              fontSize: '0.825rem',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermisos([...selectedPermisos, perm.id]);
                                } else {
                                  setSelectedPermisos(selectedPermisos.filter((id) => id !== perm.id));
                                }
                              }}
                              style={{ marginTop: '0.15rem', accentColor: 'var(--accent-primary)' }}
                            />
                            <div>
                              <code style={{ fontSize: '0.75rem', color: isChecked ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                                {perm.id}
                              </code>
                              <div style={{ fontSize: '0.775rem', color: 'var(--text-primary)' }}>{perm.label}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPermisosModalRol(null)}
                disabled={isSavingPermisos}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePermisos}
                disabled={isSavingPermisos}
              >
                {isSavingPermisos ? 'Guardando...' : 'Guardar Permisos (PUT)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
