import React, { useState } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  rol: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  fechaRegistro: string;
}

const MOCK_USUARIOS: Usuario[] = [
  { id: 1, username: 'admin', email: 'admin@pica.edu.ar', rol: 'ADMINISTRADOR', estado: 'ACTIVO', fechaRegistro: '2026-01-15' },
  { id: 2, username: 'mrodriguez', email: 'mrodriguez@pica.edu.ar', rol: 'INVESTIGADOR', estado: 'ACTIVO', fechaRegistro: '2026-02-10' },
  { id: 3, username: 'jgonzalez', email: 'jgonzalez@pica.edu.ar', rol: 'EVALUADOR', estado: 'INACTIVO', fechaRegistro: '2026-03-01' },
  { id: 4, username: 'lmartinez', email: 'lmartinez@pica.edu.ar', rol: 'PARTICIPANTE', estado: 'ELIMINADO', fechaRegistro: '2026-03-12' },
  { id: 5, username: 'cgomez', email: 'cgomez@pica.edu.ar', rol: 'PARTICIPANTE', estado: 'ACTIVO', fechaRegistro: '2026-04-05' },
  { id: 6, username: 'ffernandez', email: 'ffernandez@pica.edu.ar', rol: 'INVESTIGADOR', estado: 'ACTIVO', fechaRegistro: '2026-04-18' },
  { id: 7, username: 'sperez', email: 'sperez@pica.edu.ar', rol: 'EVALUADOR', estado: 'INACTIVO', fechaRegistro: '2026-05-20' },
];

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(MOCK_USUARIOS);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedUser?: Partial<Usuario>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  const columns: ColumnDef<Usuario>[] = [
    { key: 'username', label: 'Nombre de Usuario', sortable: true },
    { key: 'email', label: 'Correo Electrónico', sortable: true },
    {
      key: 'rol',
      label: 'Rol Asignado',
      sortable: true,
      render: (u) => (
        <span
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-secondary)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          {u.rol}
        </span>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'fechaRegistro', label: 'Fecha Registro', sortable: true },
  ];

  const formFields: FormFieldSchema[] = [
    {
      name: 'username',
      label: 'Nombre de Usuario',
      required: true,
      placeholder: 'ej. juanperez',
      readOnlyInEdit: true,
    },
    {
      name: 'email',
      label: 'Correo Electrónico',
      type: 'email',
      required: true,
      placeholder: 'ej. usuario@pica.edu.ar',
    },
    {
      name: 'rol',
      label: 'Rol en el Sistema',
      type: 'select',
      required: true,
      options: [
        { value: 'ADMINISTRADOR', label: 'Administrador' },
        { value: 'INVESTIGADOR', label: 'Investigador' },
        { value: 'EVALUADOR', label: 'Evaluador' },
        { value: 'PARTICIPANTE', label: 'Participante' },
      ],
    },
    {
      name: 'estado',
      label: 'Estado de la Cuenta',
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
      selectedUser: { estado: 'ACTIVO', rol: 'PARTICIPANTE' },
    });
  };

  const handleView = (user: Usuario) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      selectedUser: user,
    });
  };

  const handleEdit = (user: Usuario) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      selectedUser: user,
    });
  };

  const handleDelete = (user: Usuario) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, estado: 'ELIMINADO' as const } : u))
    );
  };

  const handleReactivate = (user: Usuario) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, estado: 'ACTIVO' as const } : u))
    );
  };

  const handleSubmitForm = (formData: Partial<Usuario>) => {
    if (modalState.mode === 'create') {
      const newUser: Usuario = {
        id: Date.now(),
        username: formData.username || '',
        email: formData.email || '',
        rol: formData.rol || 'PARTICIPANTE',
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || 'ACTIVO',
        fechaRegistro: new Date().toISOString().split('T')[0],
      };
      setUsuarios((prev) => [newUser, ...prev]);
    } else if (modalState.mode === 'edit' && modalState.selectedUser?.id) {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === modalState.selectedUser?.id
            ? {
                ...u,
                email: formData.email || u.email,
                rol: formData.rol || u.rol,
                estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || u.estado,
              }
            : u
        )
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: USUARIO_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Usuarios</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Administración de cuentas de usuario, estado y credenciales.
        </p>
      </div>

      <DataTable<Usuario>
        title="Padrón de Usuarios"
        description="Gestión centralizada de cuentas de usuario con búsqueda, ordenación y acciones administrativas."
        data={usuarios}
        columns={columns}
        searchFields={['username', 'email', 'rol', 'estado']}
        statusField="estado"
        idField="id"
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        createButtonText="Crear Usuario"
      />

      <FormModal<Usuario>
        isOpen={modalState.isOpen}
        title={
          modalState.mode === 'create'
            ? 'Crear Nuevo Usuario'
            : modalState.mode === 'edit'
            ? `Editar Usuario ${modalState.selectedUser?.username}`
            : `Detalles del Usuario ${modalState.selectedUser?.username}`
        }
        mode={modalState.mode}
        fields={formFields}
        initialData={modalState.selectedUser}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
};
