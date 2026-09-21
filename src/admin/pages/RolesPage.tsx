import React, { useMemo, useState } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';
import { httpClient } from '../../api/httpClient';

export interface Rol {
  id: number;
  nombre: string;
  nombreAmigable: string;
  descripcion: string;
  permisos: string[];
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  isSuperUserReadOnly?: boolean;
}

export interface PermisoItem {
  id: string;
  label: string;
}

export interface ModuloPermisos {
  modulo: string;
  icono: string;
  permisos: PermisoItem[];
}

const MODULOS_PERMISOS: ModuloPermisos[] = [
  {
    modulo: 'Módulo Usuarios',
    icono: '👥',
    permisos: [
      { id: 'USUARIO_VER', label: 'Ver listado y perfiles de usuarios' },
      { id: 'USUARIO_CREAR', label: 'Crear nuevos usuarios en el sistema' },
      { id: 'USUARIO_EDITAR', label: 'Editar información de usuarios' },
      { id: 'USUARIO_ELIMINAR', label: 'Bloquear / dar de baja usuarios' },
    ],
  },
  {
    modulo: 'Módulo Roles y Seguridad',
    icono: '🛡️',
    permisos: [
      { id: 'ROL_VER', label: 'Ver catálogo de roles y permisos' },
      { id: 'ROL_CREAR', label: 'Crear nuevos roles' },
      { id: 'ROL_EDITAR', label: 'Editar roles existentes' },
      { id: 'ROL_ELIMINAR', label: 'Dar de baja roles' },
      { id: 'ROL_ASIGNAR', label: 'Asignar roles a los usuarios' },
    ],
  },
  {
    modulo: 'Módulo Personas y Padrón',
    icono: '📇',
    permisos: [
      { id: 'PERSONA_VER', label: 'Ver padrón general de personas' },
      { id: 'PERSONA_CREAR', label: 'Registrar nuevas personas' },
      { id: 'PERSONA_EDITAR', label: 'Editar datos personales' },
      { id: 'PERSONA_ELIMINAR', label: 'Dar de baja registros del padrón' },
    ],
  },
  {
    modulo: 'Módulo Proyectos e Investigación',
    icono: '🔬',
    permisos: [
      { id: 'PROYECTO_VER', label: 'Ver proyectos e hitos' },
      { id: 'PROYECTO_CREAR', label: 'Cargar nuevos proyectos' },
      { id: 'PROYECTO_EDITAR', label: 'Modificar proyectos e integrantes' },
      { id: 'PROYECTO_EVALUAR', label: 'Emitir dictámenes de evaluación' },
    ],
  },
  {
    modulo: 'Módulo Convocatorias',
    icono: '📢',
    permisos: [
      { id: 'CONVOCATORIA_VER', label: 'Ver convocatorias públicas' },
      { id: 'CONVOCATORIA_EDITAR', label: 'Configurar términos y aperturas' },
    ],
  },
];

const ALL_READONLY_PERMISSIONS = [
  'USUARIO_VER',
  'ROL_VER',
  'PERSONA_VER',
  'PROYECTO_VER',
  'CONVOCATORIA_VER',
];

const INITIAL_ROLES: Rol[] = [
  {
    id: 1,
    nombre: 'ADMINISTRADOR',
    nombreAmigable: 'Super Usuario Administrador',
    descripcion: 'Control total de la plataforma, configuración global y matriz de seguridad.',
    permisos: [
      'USUARIO_VER', 'USUARIO_CREAR', 'USUARIO_EDITAR', 'USUARIO_ELIMINAR',
      'ROL_VER', 'ROL_CREAR', 'ROL_EDITAR', 'ROL_ELIMINAR', 'ROL_ASIGNAR',
      'PERSONA_VER', 'PERSONA_CREAR', 'PERSONA_EDITAR', 'PERSONA_ELIMINAR',
      'PROYECTO_VER', 'PROYECTO_CREAR', 'PROYECTO_EDITAR', 'PROYECTO_EVALUAR',
      'CONVOCATORIA_VER', 'CONVOCATORIA_EDITAR'
    ],
    estado: 'ACTIVO',
    isSuperUserReadOnly: true,
  },
  {
    id: 2,
    nombre: 'INVESTIGADOR',
    nombreAmigable: 'Investigador Principal',
    descripcion: 'Gestión de proyectos de investigación, carga de avances y resultados.',
    permisos: ['PROYECTO_VER', 'PROYECTO_CREAR', 'PROYECTO_EDITAR', 'PERSONA_VER'],
    estado: 'ACTIVO',
  },
  {
    id: 3,
    nombre: 'EVALUADOR',
    nombreAmigable: 'Evaluador Externo',
    descripcion: 'Revisión técnica y asignación de puntajes a proyectos.',
    permisos: ['PROYECTO_VER', 'PROYECTO_EVALUAR', 'CONVOCATORIA_VER'],
    estado: 'ACTIVO',
  },
  {
    id: 4,
    nombre: 'PARTICIPANTE',
    nombreAmigable: 'Participante Estándar',
    descripcion: 'Consulta de convocatorias e inscripción a actividades.',
    permisos: ['CONVOCATORIA_VER', 'PERSONA_VER'],
    estado: 'ACTIVO',
  },
  {
    id: 5,
    nombre: 'AUDITOR_LEGADO',
    nombreAmigable: 'Auditor Antiguo',
    descripcion: 'Rol en proceso de reemplazo por Veedor.',
    permisos: ['ROL_VER', 'USUARIO_VER'],
    estado: 'INACTIVO',
  },
];

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Rol[]>(INITIAL_ROLES);

  // Form Modal State (Crear / Editar Rol)
  const [formModalState, setFormModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedRol?: Partial<Rol>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  // Permisos Modal State (PUT /admin/roles/{id}/permisos)
  const [permisosModalRol, setPermisosModalRol] = useState<Rol | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
  const [isSavingPermisos, setIsSavingPermisos] = useState(false);
  const [permisosFeedback, setPermisosFeedback] = useState<string | null>(null);

  // Columns for DataTable
  const columns: ColumnDef<Rol>[] = [
    {
      key: 'nombre',
      label: 'Código de Rol',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <code>{r.nombre}</code>
            {r.isSuperUserReadOnly && (
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
                🔒 Super Usuario
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
      key: 'permisos',
      label: 'Permisos Asignados',
      sortable: true,
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
          {r.permisos.length} permisos
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
        if (val && !/^[A-Z0-9_]+$/.test(String(val))) {
          return 'El código debe ser en mayúsculas y guiones bajos (ej. VEEDOR).';
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
        { value: 'ELIMINADO', label: 'Eliminado' },
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

  const handleView = (rol: Rol) => {
    setFormModalState({
      isOpen: true,
      mode: 'view',
      selectedRol: rol,
    });
  };

  const handleEdit = (rol: Rol) => {
    if (rol.isSuperUserReadOnly) {
      alert('El Super Usuario Administrador está protegido en sólo lectura.');
      return;
    }
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      selectedRol: rol,
    });
  };

  const handleDelete = (rol: Rol) => {
    if (rol.isSuperUserReadOnly) {
      alert('El Super Usuario Administrador no puede ser eliminado.');
      return;
    }
    setRoles((prev) =>
      prev.map((r) => (r.id === rol.id ? { ...r, estado: 'ELIMINADO' as const } : r))
    );
  };

  const handleReactivate = (rol: Rol) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === rol.id ? { ...r, estado: 'ACTIVO' as const } : r))
    );
  };

  const handleSubmitForm = (formData: Partial<Rol>) => {
    if (formModalState.mode === 'create') {
      const newRol: Rol = {
        id: Date.now(),
        nombre: (formData.nombre || '').toUpperCase().trim(),
        nombreAmigable: formData.nombreAmigable || '',
        descripcion: formData.descripcion || '',
        permisos: [],
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || 'ACTIVO',
      };
      setRoles((prev) => [newRol, ...prev]);
    } else if (formModalState.mode === 'edit' && formModalState.selectedRol?.id) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === formModalState.selectedRol?.id
            ? {
                ...r,
                nombreAmigable: formData.nombreAmigable || r.nombreAmigable,
                descripcion: formData.descripcion || r.descripcion,
                estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || r.estado,
              }
            : r
        )
      );
    }
  };

  // Open Permisos Modal
  const handleOpenPermisos = (rol: Rol) => {
    setPermisosModalRol(rol);
    setSelectedPermisos([...rol.permisos]);
    setPermisosFeedback(null);
  };

  // Quick Action: Select Only Read-Only Permisos (*_VER)
  const handleSelectReadOnlyPermisos = () => {
    setSelectedPermisos(ALL_READONLY_PERMISSIONS);
  };

  // Quick Action: Select All Permisos
  const handleSelectAllPermisos = () => {
    const all = MODULOS_PERMISOS.flatMap((m) => m.permisos.map((p) => p.id));
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
      await httpClient.put(`/admin/roles/${permisosModalRol.id}/permisos`, { permisos: selectedPermisos });
      setRoles((prev) =>
        prev.map((r) => (r.id === permisosModalRol.id ? { ...r, permisos: selectedPermisos } : r))
      );
      setPermisosFeedback('¡Matriz de permisos guardada exitosamente!');
      setTimeout(() => setPermisosModalRol(null), 1200);
    } catch (err: any) {
      console.error('Error al guardar permisos:', err);
      setPermisosFeedback(err.detail || 'Error al guardar permisos.');
    } finally {
      setIsSavingPermisos(false);
    }
  };

  // Render Custom Action: "🔑 Permisos" button
  const renderCustomActions = (rol: Rol) => (
    <button
      type="button"
      title="Configurar matriz de permisos (PUT /admin/roles/{id}/permisos)"
      onClick={() => handleOpenPermisos(rol)}
      disabled={rol.isSuperUserReadOnly}
      style={{
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        color: 'var(--accent-primary)',
        padding: '0.35rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        cursor: rol.isSuperUserReadOnly ? 'not-allowed' : 'pointer',
        fontSize: '0.8rem',
        opacity: rol.isSuperUserReadOnly ? 0.5 : 1,
      }}
    >
      🔑 Permisos
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: ROL_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Roles y Permisos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Definición de roles del sistema y matriz de permisos por módulos con guardado dinámico.
        </p>
      </div>

      <DataTable<Rol>
        title="Matriz de Roles y Permisos"
        description="Gestión centralizada de perfiles de acceso. El Super Usuario Administrador se mantiene en sólo lectura por protección de seguridad."
        data={roles}
        columns={columns}
        searchFields={['nombre', 'nombreAmigable', 'descripcion', 'estado']}
        statusField="estado"
        idField="id"
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        customActions={renderCustomActions}
        createButtonText="Crear Nuevo Rol"
      />

      {/* Form Modal for Create / Edit Rol */}
      <FormModal<Rol>
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
              {MODULOS_PERMISOS.map((mod) => {
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
