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
  fechaNacimiento?: string;
  domicilioPostal?: string;
  usuarioUsername?: string;
  usuarioRol?: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
}

const MOCK_PERSONAS: Persona[] = [
  {
    id: 1,
    nombres: 'Administrador',
    apellidos: 'PICA',
    tipoDoc: 'DNI',
    nroDoc: '30111222',
    email: 'admin@pica.edu.ar',
    telefono: '1122334455',
    fechaNacimiento: '1990-01-01',
    domicilioPostal: 'Av. Constitución 1234, Luján',
    usuarioUsername: 'admin',
    usuarioRol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
  },
  {
    id: 2,
    nombres: 'María Elena',
    apellidos: 'Rodríguez',
    tipoDoc: 'DNI',
    nroDoc: '32999888',
    email: 'mrodriguez@pica.edu.ar',
    telefono: '1134567890',
    fechaNacimiento: '1988-04-12',
    domicilioPostal: 'San Martín 500, Luján',
    usuarioUsername: 'mrodriguez',
    usuarioRol: 'INVESTIGADOR',
    estado: 'ACTIVO',
  },
  {
    id: 3,
    nombres: 'Carlos Alberto',
    apellidos: 'Gómez',
    tipoDoc: 'DNI',
    nroDoc: '35444555',
    email: 'cgomez@pica.edu.ar',
    telefono: '1145678901',
    fechaNacimiento: '1993-09-25',
    domicilioPostal: 'Mitre 120, Luján',
    usuarioUsername: 'cgomez',
    usuarioRol: 'PARTICIPANTE',
    estado: 'INACTIVO',
  },
  {
    id: 4,
    nombres: 'Jorge Luis',
    apellidos: 'González',
    tipoDoc: 'DNI',
    nroDoc: '35123456',
    email: 'jgonzalez@pica.edu.ar',
    telefono: '1123456789',
    fechaNacimiento: '1991-11-03',
    domicilioPostal: 'Belgrano 450, Luján',
    estado: 'ACTIVO',
  },
  {
    id: 5,
    nombres: 'Laura Sofía',
    apellidos: 'Martínez',
    tipoDoc: 'PASAPORTE',
    nroDoc: 'A09876543',
    email: 'lmartinez@pica.edu.ar',
    telefono: '1167890123',
    fechaNacimiento: '1996-02-18',
    domicilioPostal: 'Las Heras 890, Luján',
    estado: 'ELIMINADO',
  },
  {
    id: 6,
    nombres: 'Fernando Daniel',
    apellidos: 'Fernández',
    tipoDoc: 'DNI',
    nroDoc: '31987654',
    email: 'ffernandez@pica.edu.ar',
    telefono: '1156789012',
    fechaNacimiento: '1985-07-30',
    domicilioPostal: 'Rivadavia 310, Luján',
    estado: 'ACTIVO',
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

  // Modal State for User Profile Card (Ficha de Usuario vinculado)
  const [selectedUserCard, setSelectedUserCard] = useState<{
    username: string;
    email: string;
    rol?: string;
    personaNombre: string;
    doc: string;
  } | null>(null);

  const columns: ColumnDef<Persona>[] = [
    {
      key: 'apellidos',
      label: 'Apellido y Nombres',
      sortable: true,
      render: (p) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{p.apellidos}, {p.nombres}</strong>
          {p.fechaNacimiento && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Nac.: {p.fechaNacimiento}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'nroDoc',
      label: 'Documento',
      sortable: true,
      render: (p) => (
        <div>
          <span style={{ fontWeight: 600 }}>
            <small style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}>{p.tipoDoc}:</small>
            {p.nroDoc}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contacto',
      sortable: true,
      render: (p) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div>{p.email}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.telefono || 'Sin teléfono'}</div>
        </div>
      ),
    },
    {
      key: 'usuarioUsername',
      label: 'Usuario Vinculado',
      sortable: true,
      render: (p) => (
        <div>
          {p.usuarioUsername ? (
            <button
              type="button"
              onClick={() =>
                setSelectedUserCard({
                  username: p.usuarioUsername!,
                  email: p.email,
                  rol: p.usuarioRol || 'PARTICIPANTE',
                  personaNombre: `${p.nombres} ${p.apellidos}`,
                  doc: `${p.tipoDoc}: ${p.nroDoc}`,
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.775rem',
                fontWeight: 600,
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-secondary)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                cursor: 'pointer',
              }}
              title="Ver ficha del usuario vinculado"
            >
              👤 @{p.usuarioUsername}
            </button>
          ) : (
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Sin usuario vinculado</span>
          )}
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
      placeholder: 'ej. Carlos Alberto',
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      required: true,
      placeholder: 'ej. Gómez',
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
      placeholder: 'ej. 32456789',
    },
    {
      name: 'email',
      label: 'Correo Electrónico de Contacto',
      type: 'email',
      required: true,
      placeholder: 'ej. persona@pica.edu.ar',
    },
    {
      name: 'telefono',
      label: 'Teléfono de Contacto',
      placeholder: 'ej. 1122334455',
    },
    {
      name: 'fechaNacimiento',
      label: 'Fecha de Nacimiento',
      type: 'date',
    },
    {
      name: 'domicilioPostal',
      label: 'Domicilio Postal / Dirección',
      placeholder: 'ej. San Martín 500, Luján',
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
        fechaNacimiento: formData.fechaNacimiento || '',
        domicilioPostal: formData.domicilioPostal || '',
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
                fechaNacimiento: formData.fechaNacimiento || p.fechaNacimiento,
                domicilioPostal: formData.domicilioPostal || p.domicilioPostal,
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
          Registro de integrantes, padrón personal y relación con cuentas de usuario del sistema.
        </p>
      </div>

      <DataTable<Persona>
        title="Padrón de Personas Registradas"
        description="Filtro de búsqueda por documento o apellido. Permite realizar el alta, edición, baja lógica, reactivación y consulta del usuario vinculado."
        data={personas}
        columns={columns}
        searchFields={['apellidos', 'nombres', 'nroDoc', 'email', 'telefono', 'usuarioUsername']}
        statusField="estado"
        idField="id"
        onCreate={handleCreate}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        createButtonText="Registrar Persona"
      />

      {/* Form Modal for Create / Edit Persona */}
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

      {/* User Profile Card Modal (Ficha de Usuario vinculado) */}
      {selectedUserCard && (
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
          onClick={() => setSelectedUserCard(null)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge">Ficha de Usuario</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.4rem' }}>@{selectedUserCard.username}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserCard(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Titular Vinculado:</span>
                <div style={{ fontWeight: 600 }}>{selectedUserCard.personaNombre}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedUserCard.doc}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Correo Electrónico:</span>
                <div>{selectedUserCard.email}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Rol Principal:</span>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-secondary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    {selectedUserCard.rol}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedUserCard(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
