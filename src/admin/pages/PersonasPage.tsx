import React, { useState, useEffect, useCallback } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';
import { StatusChip } from '../components/StatusChip';
import { personaApi, PersonaResumen, PersonaDetalle, PersonaPayload } from '../../api/personaApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { mensajeDeError } from '../mensajesError';

export const PersonasPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const puedeCrear = hasPermission('PERSONA_CREAR');
  const puedeEditar = hasPermission('PERSONA_EDITAR');
  const puedeEliminar = hasPermission('PERSONA_ELIMINAR');

  const [personas, setPersonas] = useState<PersonaResumen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Pagination & Server Control
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [sortParam, setSortParam] = useState('id,asc');

  // Fetch Personas from API
  const fetchPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await personaApi.getPersonas({
        q: searchTerm || undefined,
        // ELIMINADO no es un estado del contrato: se pide con incluirEliminados
        estado: statusFilter !== 'TODOS' && statusFilter !== 'ELIMINADO' ? statusFilter : undefined,
        incluirEliminados: statusFilter === 'ELIMINADO' || statusFilter === 'TODOS',
        page: page - 1,
        size: pageSize,
        sort: sortParam,
      });

      setPersonas(res.content || []);
      setTotalElements(res.page?.totalElements || res.content.length);
      setTotalPages(res.page?.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar personas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, page, pageSize, sortParam]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  // Modal State for Form (Create / Edit / View); editar y ver parten del detalle
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    selectedPersona?: Partial<PersonaDetalle>;
  }>({
    isOpen: false,
    mode: 'create',
  });

  // Ficha del usuario vinculado (sale del detalle de la persona)
  const [selectedUserCard, setSelectedUserCard] = useState<PersonaDetalle | null>(null);

  const abrirFichaUsuario = async (persona: PersonaResumen) => {
    try {
      setSelectedUserCard(await personaApi.getPersona(persona.id));
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo abrir la ficha del usuario.'));
    }
  };

  const columns: ColumnDef<PersonaResumen>[] = [
    {
      key: 'apellidos',
      label: 'Apellido y Nombres',
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
        <div>
          <span style={{ fontWeight: 600 }}>
            <small style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}>{p.tipoDoc || 'DNI'}:</small>
            {p.nroDoc || 'Sin doc'}
          </span>
        </div>
      ),
    },
    {
      key: 'tieneUsuario',
      label: 'Usuario Vinculado',
      render: (p) => (
        <div>
          {p.tieneUsuario ? (
            <button
              type="button"
              onClick={() => abrirFichaUsuario(p)}
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
              title="Ver estado de vinculación"
            >
              👤 Vinculado
            </button>
          ) : (
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Sin usuario vinculado</span>
          )}
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  // Form Fields Schema with Future Date Validation
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
        { value: 'CI', label: 'Cédula de Identidad' },
      ],
    },
    {
      name: 'nroDoc',
      label: 'Número de Documento',
      required: true,
      placeholder: 'ej. 32456789',
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
      validate: (val) => {
        if (val) {
          const birthDate = new Date(val);
          const today = new Date();
          if (birthDate > today) {
            return 'La fecha de nacimiento no puede ser una fecha futura.';
          }
        }
        return null;
      },
    },
    {
      name: 'domicilioPostal',
      label: 'Domicilio Postal / Dirección',
      placeholder: 'ej. San Martín 500, Luján',
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'ej. Jugador cargado por el club',
    },
    {
      name: 'estado',
      label: 'Estado en el Padrón',
      type: 'select',
      required: true,
      options: [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' },
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

  // Ver y editar abren el detalle: el listado no trae fecha, domicilio, teléfono ni descripción,
  // y el PUT reemplaza todo
  const abrirDetalle = async (persona: PersonaResumen, mode: 'view' | 'edit') => {
    try {
      const detail = await personaApi.getPersona(persona.id);
      setModalState({ isOpen: true, mode, selectedPersona: detail });
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo abrir la persona.'));
    }
  };

  const handleView = (persona: PersonaResumen) => abrirDetalle(persona, 'view');

  const handleEdit = (persona: PersonaResumen) => abrirDetalle(persona, 'edit');

  // tieneUsuario cuenta también un usuario dado de baja: decide el back (409 si el usuario sigue vivo)
  const handleDelete = async (persona: PersonaResumen) => {
    try {
      await personaApi.eliminar(persona.id);
      fetchPersonas();
    } catch (err) {
      setAviso(
        mensajeDeError(err, 'No se pudo dar de baja la persona.', {
          PERSONA_CON_USUARIO: 'Tiene un usuario activo: primero hay que dar de baja el usuario.',
        })
      );
    }
  };

  const handleReactivate = async (persona: PersonaResumen) => {
    try {
      await personaApi.reactivar(persona.id);
      fetchPersonas();
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo reactivar la persona.'));
    }
  };

  const handleSubmitForm = async (formData: Partial<PersonaDetalle>) => {
    const payload: PersonaPayload = {
      nombres: formData.nombres || '',
      apellidos: formData.apellidos || '',
      tipoDoc: formData.tipoDoc || 'DNI',
      nroDoc: formData.nroDoc || '',
      fechaNacimiento: formData.fechaNacimiento || null,
      domicilioPostal: formData.domicilioPostal || null,
      telefono: formData.telefono || null,
      descripcion: formData.descripcion || null,
      estado: (formData.estado as 'ACTIVO' | 'INACTIVO') || 'ACTIVO',
    };

    if (modalState.mode === 'create') {
      await personaApi.crear(payload);
    } else if (modalState.mode === 'edit' && modalState.selectedPersona?.id) {
      await personaApi.actualizar(modalState.selectedPersona.id, payload);
    }
    setModalState({ isOpen: false, mode: 'create' });
    fetchPersonas();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: PERSONA_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Personas</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Registro de integrantes y padrón personal conectado al backend REST `pica-back`.
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

      <DataTable<PersonaResumen>
        title="Padrón de Personas Registradas"
        description="Filtro de búsqueda por documento o apellido. Paginado desde el servidor con validación de fecha no futura y control de baja con usuario activo (409)."
        data={personas}
        columns={columns}
        searchFields={['apellidos', 'nombres', 'nroDoc']}
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
        createButtonText="Registrar Persona"
      />

      {/* Form Modal for Create / Edit Persona */}
      <FormModal<Partial<PersonaDetalle>>
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

      {/* User Profile Card Modal */}
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
                <span className="badge">Usuario Vinculado</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.4rem' }}>
                  {selectedUserCard.nombres} {selectedUserCard.apellidos}
                </h3>
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
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Documento:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedUserCard.tipoDoc || 'DOC'}: {selectedUserCard.nroDoc || 'Sin doc'}
                </div>
              </div>

              {selectedUserCard.usuario ? (
                <>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Usuario:</span>
                    <div style={{ fontWeight: 600 }}>{selectedUserCard.usuario.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedUserCard.usuario.email}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Estado:</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      <StatusChip
                        status={selectedUserCard.usuario.eliminado ? 'ELIMINADO' : selectedUserCard.usuario.estado}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Sin usuario vinculado.</div>
              )}
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
