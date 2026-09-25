import React, { useState } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';

export interface Persona {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDoc: string;
  nroDoc: string;
  email: string;
  telefono: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
}

const MOCK_PERSONAS: Persona[] = [
  {
    id: 1,
    nombres: 'Carlos Alberto',
    apellidos: 'Gómez',
    tipoDoc: 'DNI',
    nroDoc: '32456789',
    email: 'cgomez@pica.edu.ar',
    telefono: '1145678901',
    estado: 'ACTIVO',
  },
  {
    id: 2,
    nombres: 'María Elena',
    apellidos: 'Rodríguez',
    tipoDoc: 'DNI',
    nroDoc: '29876543',
    email: 'mrodriguez@pica.edu.ar',
    telefono: '1134567890',
    estado: 'ACTIVO',
  },
  {
    id: 3,
    nombres: 'Jorge Luis',
    apellidos: 'González',
    tipoDoc: 'DNI',
    nroDoc: '35123456',
    email: 'jgonzalez@pica.edu.ar',
    telefono: '1123456789',
    estado: 'INACTIVO',
  },
  {
    id: 4,
    nombres: 'Laura Sofía',
    apellidos: 'Martínez',
    tipoDoc: 'PASAPORTE',
    nroDoc: 'A09876543',
    email: 'lmartinez@pica.edu.ar',
    telefono: '1167890123',
    estado: 'ELIMINADO',
  },
  {
    id: 5,
    nombres: 'Fernando Daniel',
    apellidos: 'Fernández',
    tipoDoc: 'DNI',
    nroDoc: '31987654',
    email: 'ffernandez@pica.edu.ar',
    telefono: '1156789012',
    estado: 'ACTIVO',
  },
  {
    id: 6,
    nombres: 'Silvia Beatriz',
    apellidos: 'Pérez',
    tipoDoc: 'DNI',
    nroDoc: '27654321',
    email: 'sperez@pica.edu.ar',
    telefono: '1178901234',
    estado: 'INACTIVO',
  },
];

export const PersonasPage: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>(MOCK_PERSONAS);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedPersona?: Partial<Persona>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  const columns: ColumnDef<Persona>[] = [
    {
      key: 'apellidos',
      label: 'Nombre Completo',
      sortable: true,
      render: (p) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{p.apellidos}, {p.nombres}</strong>
        </div>
      ),
    },
    {
      key: 'nroDoc',
      label: 'Documento',
      sortable: true,
      render: (p) => (
        <span>
          <small style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}>{p.tipoDoc}:</small>
          {p.nroDoc}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Contacto',
      sortable: true,
      render: (p) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div>{p.email}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.telefono || 'Sin tel.'}</div>
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  const formFields: FormFieldSchema[] = [
    {
      name: 'nombres',
      label: 'Nombres',
      required: true,
      placeholder: 'ej. Juan Carlos',
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      required: true,
      placeholder: 'ej. Pérez',
    },
    {
      name: 'tipoDoc',
      label: 'Tipo de Documento',
      type: 'select',
      required: true,
      options: [
        { value: 'DNI', label: 'DNI' },
        { value: 'PASAPORTE', label: 'Pasaporte' },
        { value: 'LE', label: 'Libreta Enrolamiento' },
        { value: 'LC', label: 'Libreta Cívica' },
      ],
    },
    {
      name: 'nroDoc',
      label: 'Número de Documento',
      required: true,
      placeholder: 'ej. 30123456',
    },
    {
      name: 'email',
      label: 'Correo Electrónico de Contacto',
      type: 'email',
      required: true,
      placeholder: 'ej. persona@ejemplo.com',
    },
    {
      name: 'telefono',
      label: 'Teléfono de Contacto',
      placeholder: 'ej. 1122334455',
    },
    {
      name: 'estado',
      label: 'Estado en el Padrón',
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
      selectedPersona: { tipoDoc: 'DNI', estado: 'ACTIVO' },
    });
  };

  const handleView = (persona: Persona) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      selectedPersona: persona,
    });
  };

  const handleEdit = (persona: Persona) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      selectedPersona: persona,
    });
  };

  const handleDelete = (persona: Persona) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === persona.id ? { ...p, estado: 'ELIMINADO' as const } : p))
    );
  };

  const handleReactivate = (persona: Persona) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === persona.id ? { ...p, estado: 'ACTIVO' as const } : p))
    );
  };

  const handleSubmitForm = (formData: Partial<Persona>) => {
    if (modalState.mode === 'create') {
      const newPersona: Persona = {
        id: Date.now(),
        nombres: formData.nombres || '',
        apellidos: formData.apellidos || '',
        tipoDoc: formData.tipoDoc || 'DNI',
        nroDoc: formData.nroDoc || '',
        email: formData.email || '',
        telefono: formData.telefono || '',
        estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || 'ACTIVO',
      };
      setPersonas((prev) => [newPersona, ...prev]);
    } else if (modalState.mode === 'edit' && modalState.selectedPersona?.id) {
      setPersonas((prev) =>
        prev.map((p) =>
          p.id === modalState.selectedPersona?.id
            ? {
                ...p,
                nombres: formData.nombres || p.nombres,
                apellidos: formData.apellidos || p.apellidos,
                tipoDoc: formData.tipoDoc || p.tipoDoc,
                nroDoc: formData.nroDoc || p.nroDoc,
                email: formData.email || p.email,
                telefono: formData.telefono || p.telefono,
                estado: (formData.estado as 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') || p.estado,
              }
            : p
        )
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: PERSONA_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Personas</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Registro y datos personales de miembros y participantes.
        </p>
      </div>

      <DataTable<Persona>
        title="Padrón de Personas"
        description="Listado general de integrantes y fichas personales en el sistema."
        data={personas}
        columns={columns}
        searchFields={['nombres', 'apellidos', 'nroDoc', 'email', 'telefono', 'estado']}
        statusField="estado"
        idField="id"
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        createButtonText="Registrar Persona"
      />

      <FormModal<Persona>
        isOpen={modalState.isOpen}
        title={
          modalState.mode === 'create'
            ? 'Registrar Nueva Persona'
            : modalState.mode === 'edit'
            ? `Editar Ficha de ${modalState.selectedPersona?.nombres} ${modalState.selectedPersona?.apellidos}`
            : `Ficha de ${modalState.selectedPersona?.nombres} ${modalState.selectedPersona?.apellidos}`
        }
        mode={modalState.mode}
        fields={formFields}
        initialData={modalState.selectedPersona}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
};
