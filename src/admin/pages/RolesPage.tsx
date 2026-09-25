import React, { useState } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';

export interface Rol {
  id: number;
  nombre: string;
  nombreAmigable: string;
  descripcion: string;
  permisosCount: number;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
}

const MOCK_ROLES: Rol[] = [
  {
    id: 1,
    nombre: 'ADMINISTRADOR',
    nombreAmigable: 'Administrador del Sistema',
    descripcion: 'Acceso total a todas las funciones y configuraciones globales.',
    permisosCount: 15,
    estado: 'ACTIVO',
  },
  {
    id: 2,
    nombre: 'INVESTIGADOR',
    nombreAmigable: 'Investigador Principal',
    descripcion: 'Gestión de proyectos, carga de resultados e hitos.',
    permisosCount: 8,
    estado: 'ACTIVO',
  },
  {
    id: 3,
    nombre: 'EVALUADOR',
    nombreAmigable: 'Evaluador Externo',
    descripcion: 'Revisión y dictamen de proyectos asignados.',
    permisosCount: 4,
    estado: 'ACTIVO',
  },
  {
    id: 4,
    nombre: 'PARTICIPANTE',
    nombreAmigable: 'Participante Estándar',
    descripcion: 'Consulta de convocatorias e inscripción.',
    permisosCount: 2,
    estado: 'ACTIVO',
  },
  {
    id: 5,
    nombre: 'AUDITOR_TEMPORAL',
    nombreAmigable: 'Auditor de Seguridad',
    descripcion: 'Rol de lectura histórica para auditoría.',
    permisosCount: 3,
    estado: 'INACTIVO',
  },
  {
    id: 6,
    nombre: 'INVITADO_OBSOLETO',
    nombreAmigable: 'Invitado Antiguo',
    descripcion: 'Rol en desuso sustituido por Participante.',
    permisosCount: 0,
    estado: 'ELIMINADO',
  },
];

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Rol[]>(MOCK_ROLES);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedRol?: Partial<Rol>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  const columns: ColumnDef<Rol>[] = [
    {
      key: 'nombre',
      label: 'Código de Rol',
      sortable: true,
      render: (r) => <code>{r.nombre}</code>,
    },
    { key: 'nombreAmigable', label: 'Nombre Display', sortable: true },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'permisosCount',
      label: 'Permisos Asignados',
      sortable: true,
      render: (r) => (
        <span
          style={{
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-color)',
          }}
        >
          {r.permisosCount} permisos
        </span>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  const formFields: FormFieldSchema[] = [
    {
      name: 'nombre',
      label: 'Identificador / Código del Rol',
      required: true,
      placeholder: 'ej. GESTOR_PROYECTOS',
      readOnlyInEdit: true,
      validate: (val) => {
        if (val && !/^[A-Z0-9_]+$/.test(String(val))) {
          return 'El código debe estar en mayúsculas y guiones bajos (ej. ROL_ADMIN).';
        }
        return null;
      },
    },
    {
      name: 'nombreAmigable',
      label: 'Nombre Amigable',
      required: true,
      placeholder: 'ej. Gestor de Proyectos',
    },
    {
      name: 'descripcion',
      label: 'Descripción de Alcance',
      type: 'textarea',
      placeholder: 'Describa las responsabilidades y alcance de este rol...',
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

  const handleCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      selectedRol: { estado: 'ACTIVO' },
    });
  };

  const handleView = (rol: Rol) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      selectedRol: rol,
    });
  };

  const handleEdit = (rol: Rol) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      selectedRol: rol,
    });
  };

  const handleDelete = (rol: Rol) => {
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
    if (modalState.mode === 'create') {
      const newRol: Rol = {
        id: Date.now(),
        nombre: (formData.nombre || '').toUpperCase(),
        nombreAmigable: formData.nombreAmigable || '',
        descripcion: formData.descripcion || '',
        permisosCount: 0,
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || 'ACTIVO',
      };
      setRoles((prev) => [newRol, ...prev]);
    } else if (modalState.mode === 'edit' && modalState.selectedRol?.id) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === modalState.selectedRol?.id
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: ROL_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Roles y Permisos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configuración de jerarquías de seguridad y matriz de permisos del sistema.
        </p>
      </div>

      <DataTable<Rol>
        title="Catálogo de Roles"
        description="Definición de roles del sistema y matriz de seguridad."
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
        createButtonText="Crear Rol"
      />

      <FormModal<Rol>
        isOpen={modalState.isOpen}
        title={
          modalState.mode === 'create'
            ? 'Crear Nuevo Rol'
            : modalState.mode === 'edit'
            ? `Editar Rol ${modalState.selectedRol?.nombreAmigable}`
            : `Detalles del Rol ${modalState.selectedRol?.nombreAmigable}`
        }
        mode={modalState.mode}
        fields={formFields}
        initialData={modalState.selectedRol}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
};
