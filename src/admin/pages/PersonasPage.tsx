import React, { useState, useEffect, useCallback } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { FormModal, FormFieldSchema } from '../components/FormModal';
import { StatusChip } from '../components/StatusChip';
import { personaApi, PersonaResumen, PersonaDetalle, PersonaPayload } from '../../api/personaApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Modal } from '../../shared/ui';
import './PersonasPage.css';
import {
  validateNombreApellido,
  validateDocumento,
  validateFechaNacimiento,
  getTodayDateString,
  MIN_FECHA_NACIMIENTO,
} from '../../shared/validators';

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
          <strong style={{ color: 'var(--color-text)' }}>
            {p.apellidos}, {p.nombres}
          </strong>
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
            <small style={{ color: 'var(--color-text-secondary)', marginRight: '0.25rem' }}>
              {p.tipoDoc || 'DNI'}:
            </small>
            {p.nroDoc || 'Sin doc'}
          </span>
        </div>
      ),
    },
    {
      key: 'tieneUsuario',
      label: 'Usuario',
      render: (p) => (
        <div>
          {p.tieneUsuario ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => abrirFichaUsuario(p)}
              title="Ver su usuario"
            >
              Ver usuario
            </Button>
          ) : (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Sin usuario
            </span>
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
      validate: (val) => validateNombreApellido(String(val || ''), 'Nombres', true),
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      required: true,
      placeholder: 'ej. Gómez',
      validate: (val) => validateNombreApellido(String(val || ''), 'Apellidos', true),
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
      validate: (val, formData) =>
        validateDocumento(String(val || ''), formData.tipoDoc || 'DNI', true),
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
      min: MIN_FECHA_NACIMIENTO,
      max: getTodayDateString(),
      validate: (val) => validateFechaNacimiento(val ? String(val) : '', false),
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
        <h1 style={{ margin: 0 }}>Personas</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
          Padrón de integrantes: los datos de cada persona, con o sin usuario.
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
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <DataTable<PersonaResumen>
        title="Listado de personas"
        description="Buscá por apellido o documento, y filtrá por estado."
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
        createButtonText="Registrar persona"
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

      {/* Ficha del usuario de la persona */}
      <Modal
        isOpen={selectedUserCard !== null}
        title={selectedUserCard ? `${selectedUserCard.nombres} ${selectedUserCard.apellidos}` : ''}
        size="sm"
        onClose={() => setSelectedUserCard(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelectedUserCard(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedUserCard && (
          <dl className="ficha-datos">
            <div>
              <dt>Documento</dt>
              <dd>
                {selectedUserCard.tipoDoc || 'DOC'} {selectedUserCard.nroDoc || 'Sin documento'}
              </dd>
            </div>
            {selectedUserCard.usuario ? (
              <>
                <div>
                  <dt>Usuario</dt>
                  <dd>
                    @{selectedUserCard.usuario.username}
                    <br />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedUserCard.usuario.email}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <StatusChip
                      status={
                        selectedUserCard.usuario.eliminado
                          ? 'ELIMINADO'
                          : selectedUserCard.usuario.estado
                      }
                    />
                  </dd>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No tiene usuario.</p>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
};
