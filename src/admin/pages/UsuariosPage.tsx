import React, { useMemo, useState } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { httpClient } from '../../api/httpClient';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  roles: string[];
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  personaId?: number;
  personaNombre?: string;
  personaDoc?: string;
  fechaRegistro: string;
  isAdminReadOnly?: boolean;
}

interface PersonaMock {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDoc: string;
  nroDoc: string;
  email: string;
  telefono: string;
}

const MOCK_PERSONAS_PADRON: PersonaMock[] = [
  { id: 101, nombres: 'Juan Carlos', apellidos: 'Pérez', tipoDoc: 'DNI', nroDoc: '30111222', email: 'jperez@pica.edu.ar', telefono: '1122334455' },
  { id: 102, nombres: 'María Elena', apellidos: 'Rodríguez', tipoDoc: 'DNI', nroDoc: '32999888', email: 'mrodriguez@pica.edu.ar', telefono: '1133445566' },
  { id: 103, nombres: 'Carlos Alberto', apellidos: 'Gómez', tipoDoc: 'DNI', nroDoc: '35444555', email: 'cgomez@pica.edu.ar', telefono: '1144556677' },
];

const INITIAL_USUARIOS: Usuario[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@pica.edu.ar',
    roles: ['ADMINISTRADOR'],
    estado: 'ACTIVO',
    personaId: 1,
    personaNombre: 'Administrador PICA',
    personaDoc: 'DNI: 30111222',
    fechaRegistro: '2026-01-01',
    isAdminReadOnly: true,
  },
  {
    id: 2,
    username: 'mrodriguez',
    email: 'mrodriguez@pica.edu.ar',
    roles: ['INVESTIGADOR'],
    estado: 'ACTIVO',
    personaId: 102,
    personaNombre: 'María Elena Rodríguez',
    personaDoc: 'DNI: 32999888',
    fechaRegistro: '2026-02-10',
  },
  {
    id: 3,
    username: 'cgomez',
    email: 'cgomez@pica.edu.ar',
    roles: ['PARTICIPANTE'],
    estado: 'INACTIVO',
    personaId: 103,
    personaNombre: 'Carlos Alberto Gómez',
    personaDoc: 'DNI: 35444555',
    fechaRegistro: '2026-03-05',
  },
];

const SYSTEM_ROLES = [
  { id: 'ADMINISTRADOR', label: 'Administrador del Sistema', desc: 'Acceso total a la plataforma' },
  { id: 'ORGANIZADOR', label: 'Organizador de Eventos', desc: 'Gestión de convocatorias y talleres' },
  { id: 'INVESTIGADOR', label: 'Investigador Principal', desc: 'Carga de proyectos e hitos' },
  { id: 'EVALUADOR', label: 'Evaluador Externo', desc: 'Dictamen de convocatorias' },
  { id: 'PARTICIPANTE', label: 'Participante Estándar', desc: 'Consulta e inscripción' },
];

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  const [selectedRolFilter, setSelectedRolFilter] = useState<string>('TODOS');

  // Modal State: Create User
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [docSearchInput, setDocSearchInput] = useState('');
  const [foundPersona, setFoundPersona] = useState<PersonaMock | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Inline persona creation toggle
  const [isInlinePersona, setIsInlinePersona] = useState(false);
  const [inlinePersonaData, setInlinePersonaData] = useState({
    nombres: '',
    apellidos: '',
    tipoDoc: 'DNI',
    nroDoc: '',
    email: '',
    telefono: '',
  });

  // User form data
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    password: '',
    initialRole: 'PARTICIPANTE',
  });
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});

  // Modal State: Edit User
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ email: '' });

  // Modal State: Roles Tab (PUT /admin/usuarios/{id}/roles)
  const [rolesModalUser, setRolesModalUser] = useState<Usuario | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [rolesMessage, setRolesMessage] = useState<string | null>(null);

  // Modal State: Reset Password
  const [resetPassUser, setResetPassUser] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Filtered dataset for Rol filter
  const filteredData = useMemo(() => {
    if (selectedRolFilter === 'TODOS') return usuarios;
    return usuarios.filter((u) => u.roles.includes(selectedRolFilter));
  }, [usuarios, selectedRolFilter]);

  // Handle Search Persona by Document
  const handleSearchPersona = () => {
    setSearchError(null);
    if (!docSearchInput.trim()) {
      setSearchError('Ingrese un número de documento.');
      return;
    }

    const matched = MOCK_PERSONAS_PADRON.find((p) => p.nroDoc.trim() === docSearchInput.trim());
    if (matched) {
      setFoundPersona(matched);
      setIsInlinePersona(false);
      setCreateUserForm((prev) => ({ ...prev, email: prev.email || matched.email }));
    } else {
      setFoundPersona(null);
      setSearchError(`No se encontró persona con documento ${docSearchInput}. Podés crearla en línea a continuación.`);
    }
  };

  // Handle Create User Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!createUserForm.username.trim()) {
      errors.username = 'El nombre de usuario es obligatorio.';
    }
    if (!createUserForm.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio.';
    }
    if (!createUserForm.password || createUserForm.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (isInlinePersona) {
      if (!inlinePersonaData.nombres.trim()) errors.inlineNombres = 'El nombre es obligatorio.';
      if (!inlinePersonaData.apellidos.trim()) errors.inlineApellidos = 'El apellido es obligatorio.';
      if (!inlinePersonaData.nroDoc.trim()) errors.inlineDoc = 'El documento es obligatorio.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    let personaId = foundPersona?.id;
    let personaNombre = foundPersona ? `${foundPersona.nombres} ${foundPersona.apellidos}` : undefined;
    let personaDoc = foundPersona ? `${foundPersona.tipoDoc}: ${foundPersona.nroDoc}` : undefined;

    if (isInlinePersona) {
      personaId = Date.now();
      personaNombre = `${inlinePersonaData.nombres} ${inlinePersonaData.apellidos}`;
      personaDoc = `${inlinePersonaData.tipoDoc}: ${inlinePersonaData.nroDoc}`;
    }

    const newUser: Usuario = {
      id: Date.now(),
      username: createUserForm.username.toLowerCase().trim(),
      email: createUserForm.email.trim(),
      roles: [createUserForm.initialRole],
      estado: 'ACTIVO',
      personaId,
      personaNombre: personaNombre || 'Persona no vinculada',
      personaDoc,
      fechaRegistro: new Date().toISOString().split('T')[0],
    };

    setUsuarios((prev) => [newUser, ...prev]);
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setCreateUserForm({ username: '', email: '', password: '', initialRole: 'PARTICIPANTE' });
    setDocSearchInput('');
    setFoundPersona(null);
    setSearchError(null);
    setIsInlinePersona(false);
    setInlinePersonaData({ nombres: '', apellidos: '', tipoDoc: 'DNI', nroDoc: '', email: '', telefono: '' });
    setCreateFormErrors({});
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsuarios((prev) =>
      prev.map((u) => (u.id === editingUser.id ? { ...u, email: editForm.email } : u))
    );
    setEditingUser(null);
  };

  // Handle Soft-Delete (Bloquear)
  const handleDeleteUser = (user: Usuario) => {
    if (user.isAdminReadOnly) {
      alert('El usuario Administrador principal no puede ser bloqueado.');
      return;
    }
    setUsuarios((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, estado: 'ELIMINADO' } : u))
    );
  };

  // Handle Reactivate User
  const handleReactivateUser = (user: Usuario) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, estado: 'ACTIVO' } : u))
    );
  };

  // Handle Open Roles Modal
  const handleOpenRoles = (user: Usuario) => {
    setRolesModalUser(user);
    setSelectedRoles([...user.roles]);
    setRolesMessage(null);
  };

  // Save Roles via PUT /admin/usuarios/{id}/roles
  const handleSaveRoles = async () => {
    if (!rolesModalUser) return;
    setIsSavingRoles(true);
    setRolesMessage(null);

    try {
      await httpClient.put(`/admin/usuarios/${rolesModalUser.id}/roles`, { roles: selectedRoles });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === rolesModalUser.id ? { ...u, roles: selectedRoles } : u))
      );
      setRolesMessage('¡Roles asignados exitosamente!');
      setTimeout(() => setRolesModalUser(null), 1000);
    } catch (err: any) {
      console.error('Error al guardar roles:', err);
      setRolesMessage(err.detail || 'Error al actualizar roles.');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Save Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPassword) return;

    try {
      await httpClient.post(`/admin/usuarios/${resetPassUser.id}/reset-password`, { passwordNueva: newPassword });
      setResetSuccess(`La contraseña para ${resetPassUser.username} fue actualizada correctamente.`);
      setTimeout(() => {
        setResetPassUser(null);
        setNewPassword('');
        setResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      alert('Error al resetear contraseña: ' + (err.message || 'Intente nuevamente.'));
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<Usuario>[] = [
    {
      key: 'username',
      label: 'Usuario',
      sortable: true,
      render: (u) => (
        <div>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {u.username}
            {u.isAdminReadOnly && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                🔒 Admin Principal
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
        </div>
      ),
    },
    {
      key: 'personaNombre',
      label: 'Persona Vinculada',
      sortable: true,
      render: (u) => (
        <div>
          <div style={{ fontSize: '0.875rem' }}>{u.personaNombre || 'Sin vincular'}</div>
          {u.personaDoc && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.personaDoc}</div>
          )}
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (u) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {u.roles.map((r) => (
            <span
              key={r}
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  r === 'ADMINISTRADOR'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : r === 'ORGANIZADOR'
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(99, 102, 241, 0.15)',
                color:
                  r === 'ADMINISTRADOR'
                    ? '#f87171'
                    : r === 'ORGANIZADOR'
                    ? 'var(--accent-secondary)'
                    : 'var(--accent-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'fechaRegistro', label: 'Fecha Registro', sortable: true },
  ];

  // Render Rol Filter select next to Status filter
  const extraFilterComponent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Rol:</span>
      <select
        value={selectedRolFilter}
        onChange={(e) => setSelectedRolFilter(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="TODOS">Todos los Roles</option>
        <option value="ADMINISTRADOR">ADMINISTRADOR</option>
        <option value="ORGANIZADOR">ORGANIZADOR</option>
        <option value="INVESTIGADOR">INVESTIGADOR</option>
        <option value="EVALUADOR">EVALUADOR</option>
        <option value="PARTICIPANTE">PARTICIPANTE</option>
      </select>
    </div>
  );

  // Render Custom Row Actions (Roles tab & Reset password)
  const renderCustomRowActions = (user: Usuario) => (
    <>
      <button
        type="button"
        title="Gestionar Roles (PUT /admin/usuarios/{id}/roles)"
        onClick={() => handleOpenRoles(user)}
        disabled={user.isAdminReadOnly}
        style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: 'var(--accent-secondary)',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: user.isAdminReadOnly ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          opacity: user.isAdminReadOnly ? 0.5 : 1,
        }}
      >
        🛡️ Roles
      </button>

      <button
        type="button"
        title="Resetear Contraseña"
        onClick={() => {
          setResetPassUser(user);
          setNewPassword('');
          setResetSuccess(null);
        }}
        disabled={user.isAdminReadOnly}
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#f59e0b',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: user.isAdminReadOnly ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          opacity: user.isAdminReadOnly ? 0.5 : 1,
        }}
      >
        🔑 Reset
      </button>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="badge">Permiso: USUARIO_VER</span>
        <h1 style={{ marginTop: '0.5rem' }}>Gestión de Cuentas de Usuario</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Buscador con filtros por rol/estado, alta con vinculación de persona por documento, asignación de roles y reseteo de claves.
        </p>
      </div>

      <DataTable<Usuario>
        title="Directorio de Usuarios"
        description="Filtros dinámicos de texto, estado y rol. Acciones de edición, bloqueo, asignación de roles y reset de clave."
        data={filteredData}
        columns={columns}
        searchFields={['username', 'email', 'personaNombre', 'personaDoc', 'roles']}
        statusField="estado"
        idField="id"
        onCreate={() => {
          resetCreateForm();
          setIsCreateOpen(true);
        }}
        onEdit={(u) => {
          if (u.isAdminReadOnly) {
            alert('El usuario Administrador principal no puede ser modificado.');
            return;
          }
          setEditingUser(u);
          setEditForm({ email: u.email });
        }}
        onDelete={handleDeleteUser}
        onReactivate={handleReactivateUser}
        extraFilters={extraFilterComponent}
        customActions={renderCustomRowActions}
        createButtonText="Alta de Usuario"
      />

      {/* MODAL 1: ALTA DE USUARIO (Buscador persona por documento + Opción Crear en Línea) */}
      {isCreateOpen && (
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
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Alta de Nuevo Usuario</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sección Buscador de Persona */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                  1. Vinculación con Persona (Búsqueda por Documento)
                </label>

                {!isInlinePersona ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Ingrese DNI o Nro Documento (ej. 30111222)..."
                        value={docSearchInput}
                        onChange={(e) => setDocSearchInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSearchPersona}
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        🔍 Buscar
                      </button>
                    </div>

                    {searchError && (
                      <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.4rem' }}>{searchError}</p>
                    )}

                    {foundPersona && (
                      <div
                        style={{
                          marginTop: '0.6rem',
                          padding: '0.6rem 0.8rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          color: '#10b981',
                        }}
                      >
                        ✓ <strong>Persona vinculada:</strong> {foundPersona.nombres} {foundPersona.apellidos} ({foundPersona.tipoDoc}: {foundPersona.nroDoc})
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlinePersona(true);
                          setFoundPersona(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        + ¿La persona no existe? Crear persona en línea
                      </button>
                    </div>
                  </>
                ) : (
                  /* Formulario en Línea para Crear Persona */
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Registro de Persona en Línea</span>
                      <button
                        type="button"
                        onClick={() => setIsInlinePersona(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Volver al buscador
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <input
                          type="text"
                          placeholder="Nombres *"
                          value={inlinePersonaData.nombres}
                          onChange={(e) => setInlinePersonaData({ ...inlinePersonaData, nombres: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            border: createFormErrors.inlineNombres ? '1px solid #ef4444' : '1px solid var(--border-color)',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Apellidos *"
                          value={inlinePersonaData.apellidos}
                          onChange={(e) => setInlinePersonaData({ ...inlinePersonaData, apellidos: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            border: createFormErrors.inlineApellidos ? '1px solid #ef4444' : '1px solid var(--border-color)',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                      <select
                        value={inlinePersonaData.tipoDoc}
                        onChange={(e) => setInlinePersonaData({ ...inlinePersonaData, tipoDoc: e.target.value })}
                        style={{
                          padding: '0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <option value="DNI">DNI</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nro Documento *"
                        value={inlinePersonaData.nroDoc}
                        onChange={(e) => setInlinePersonaData({ ...inlinePersonaData, nroDoc: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: createFormErrors.inlineDoc ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección Datos de Cuenta de Usuario */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                  2. Credenciales y Datos de Usuario
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nombre de Usuario *</label>
                    <input
                      type="text"
                      placeholder="ej. jorganizador"
                      value={createUserForm.username}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.username ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    />
                    {createFormErrors.username && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{createFormErrors.username}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Correo Electrónico *</label>
                    <input
                      type="email"
                      placeholder="ej. usuario@pica.edu.ar"
                      value={createUserForm.email}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.email ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    />
                    {createFormErrors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{createFormErrors.email}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contraseña Inicial *</label>
                    <input
                      type="password"
                      placeholder="Contraseña inicial..."
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.password ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    />
                    {createFormErrors.password && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{createFormErrors.password}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rol Inicial</label>
                    <select
                      value={createUserForm.initialRole}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, initialRole: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="PARTICIPANTE">PARTICIPANTE</option>
                      <option value="ORGANIZADOR">ORGANIZADOR</option>
                      <option value="INVESTIGADOR">INVESTIGADOR</option>
                      <option value="EVALUADOR">EVALUADOR</option>
                      <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDICIÓN DE USUARIO */}
      {editingUser && (
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
          onClick={() => setEditingUser(null)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              Editar Usuario: {editingUser.username}
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Correo Electrónico</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PESTAÑA / MODAL ROLES CON CHECKBOXES (PUT /admin/usuarios/{id}/roles) */}
      {rolesModalUser && (
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
          onClick={() => setRolesModalUser(null)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '520px', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Asignación de Roles</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Usuario: <strong>{rolesModalUser.username}</strong> ({rolesModalUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRolesModalUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Llama al endpoint <code>PUT /admin/usuarios/{rolesModalUser.id}/roles</code> enviando la matriz de checkboxes seleccionada.
            </p>

            {rolesMessage && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  backgroundColor: rolesMessage.includes('exitosamente') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: rolesMessage.includes('exitosamente') ? '#10b981' : '#f87171',
                  border: rolesMessage.includes('exitosamente') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {rolesMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {SYSTEM_ROLES.map((r) => {
                const isChecked = selectedRoles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                      border: isChecked ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, r.id]);
                        } else {
                          setSelectedRoles(selectedRoles.filter((item) => item !== r.id));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.label} <code>({r.id})</code>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRolesModalUser(null)}
                disabled={isSavingRoles}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRoles}
                disabled={isSavingRoles}
              >
                {isSavingRoles ? 'Guardando...' : 'Guardar Roles (PUT)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET DE CONTRASEÑA */}
      {resetPassUser && (
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
          onClick={() => setResetPassUser(null)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Resetear Contraseña
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Usuario: <strong>{resetPassUser.username}</strong>
            </p>

            {resetSuccess && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nueva Contraseña</label>
                <input
                  type="password"
                  placeholder="Ingrese nueva clave..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNewPassword(`Temp#${Math.floor(100000 + Math.random() * 900000)}`)}
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                ⚡ Generar Clave Temporal Aleatoria
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetPassUser(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Blanquear Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
