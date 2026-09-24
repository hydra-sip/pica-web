import React, { useState, useEffect, useCallback } from 'react';
import { DataTable, ColumnDef } from '../components/DataTable';
import { usuarioApi, UsuarioResumen } from '../../api/usuarioApi';
import { personaApi, PersonaResumen } from '../../api/personaApi';
import { rolApi, RolResumen } from '../../api/rolApi';

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Pagination & Filters (Spring Data REST)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [sortParam, setSortParam] = useState('id,asc');

  // Catalogue of available Roles (loaded from server)
  const [availableRoles, setAvailableRoles] = useState<RolResumen[]>([]);

  // Fetch users from API
  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await usuarioApi.getUsuarios({
        q: searchTerm || undefined,
        // ELIMINADO no es un estado del contrato: se pide con incluirEliminados
        estado: statusFilter !== 'TODOS' && statusFilter !== 'ELIMINADO' ? statusFilter : undefined,
        incluirEliminados: statusFilter === 'ELIMINADO' || statusFilter === 'TODOS',
        page: page - 1, // Spring Data 0-indexed
        size: pageSize,
        sort: sortParam,
      });

      setUsuarios(res.content || []);
      setTotalElements(res.page?.totalElements || res.content.length);
      setTotalPages(res.page?.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, page, pageSize, sortParam]);

  // Load available roles list
  useEffect(() => {
    rolApi.getRoles({ size: 100 }).then((res) => {
      setAvailableRoles(res.content || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Modal State: Create User
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [docSearchInput, setDocSearchInput] = useState('');
  const [foundPersonas, setFoundPersonas] = useState<PersonaResumen[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<PersonaResumen | null>(null);
  const [isSearchingPersona, setIsSearchingPersona] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Inline persona creation
  const [isInlinePersona, setIsInlinePersona] = useState(false);
  const [inlinePersonaData, setInlinePersonaData] = useState({
    nombres: '',
    apellidos: '',
    tipoDoc: 'DNI',
    nroDoc: '',
    telefono: '',
  });

  // User form data
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    passwordTemporal: '',
    initialRoleId: 0,
  });
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Modal State: Edit User
  const [editingUser, setEditingUser] = useState<UsuarioResumen | null>(null);
  const [editForm, setEditForm] = useState({ email: '', estado: 'ACTIVO' as 'ACTIVO' | 'BLOQUEADO' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal State: Roles Assignment (numeric IDs)
  const [rolesModalUser, setRolesModalUser] = useState<UsuarioResumen | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [rolesMessage, setRolesMessage] = useState<string | null>(null);

  // Modal State: Reset Password
  const [resetPassUser, setResetPassUser] = useState<UsuarioResumen | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Handle Search Persona by Document / Query using API
  const handleSearchPersona = async () => {
    setSearchError(null);
    if (!docSearchInput.trim()) {
      setSearchError('Ingrese un término de búsqueda o número de documento.');
      return;
    }

    setIsSearchingPersona(true);
    try {
      const res = await personaApi.getPersonas({ q: docSearchInput.trim() });
      setFoundPersonas(res.content || []);
      if ((res.content || []).length === 0) {
        setSearchError(`No se encontraron personas con el criterio "${docSearchInput}". Podés crearla en línea a continuación.`);
      }
    } catch (err: any) {
      setSearchError(err?.problemDetail?.detail || 'Error al buscar personas.');
    } finally {
      setIsSearchingPersona(false);
    }
  };

  // Handle Create User Submit (Real API)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!createUserForm.username.trim()) {
      errors.username = 'El nombre de usuario es obligatorio.';
    }
    if (!createUserForm.email.trim()) {
      errors.email = 'El correo electrónico es obligatorio.';
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(createUserForm.passwordTemporal)) {
      errors.passwordTemporal = 'Mínimo 8 caracteres, una mayúscula y un número.';
    }

    if (!isInlinePersona && !selectedPersona) {
      errors.persona = 'Debe seleccionar una persona vinculada.';
    }

    if (isInlinePersona) {
      if (!inlinePersonaData.nombres.trim()) errors.inlineNombres = 'El nombre es obligatorio.';
      if (!inlinePersonaData.apellidos.trim()) errors.inlineApellidos = 'El apellido es obligatorio.';
      if (!inlinePersonaData.nroDoc.trim()) errors.inlineDoc = 'El número de documento es obligatorio.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    setIsCreatingUser(true);
    try {
      let targetPersonaId = selectedPersona?.id;

      // 1. Create persona online if inline mode is selected
      if (isInlinePersona) {
        const createdPersona = await personaApi.crear({
          nombres: inlinePersonaData.nombres.trim(),
          apellidos: inlinePersonaData.apellidos.trim(),
          tipoDoc: inlinePersonaData.tipoDoc,
          nroDoc: inlinePersonaData.nroDoc.trim(),
          telefono: inlinePersonaData.telefono.trim() || undefined,
        });
        targetPersonaId = createdPersona.id;
      }

      if (!targetPersonaId) {
        throw new Error('No se pudo determinar la persona a vincular.');
      }

      // 2. Create User via POST /admin/usuarios
      await usuarioApi.crear({
        username: createUserForm.username.toLowerCase().trim(),
        email: createUserForm.email.trim(),
        passwordTemporal: createUserForm.passwordTemporal,
        personaId: targetPersonaId,
        roles: createUserForm.initialRoleId ? [createUserForm.initialRoleId] : [],
      });

      setIsCreateOpen(false);
      resetCreateForm();
      fetchUsuarios();
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      setCreateFormErrors({
        server: err?.problemDetail?.detail || err?.message || 'Error al procesar la alta de usuario.',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const resetCreateForm = () => {
    setCreateUserForm({ username: '', email: '', passwordTemporal: '', initialRoleId: 0 });
    setDocSearchInput('');
    setFoundPersonas([]);
    setSelectedPersona(null);
    setSearchError(null);
    setIsInlinePersona(false);
    setInlinePersonaData({ nombres: '', apellidos: '', tipoDoc: 'DNI', nroDoc: '', telefono: '' });
    setCreateFormErrors({});
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.protegido) {
      return;
    }

    setIsSavingEdit(true);
    try {
      await usuarioApi.actualizar(editingUser.id, {
        username: editingUser.username,
        email: editForm.email,
        estado: editForm.estado,
        personaId: editingUser.persona.id,
      });
      setEditingUser(null);
      fetchUsuarios();
    } catch (err: any) {
      setAviso('Error al actualizar usuario: ' + (err?.problemDetail?.detail || err?.message || 'Falla al guardar.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Soft-Delete
  const handleDeleteUser = async (user: UsuarioResumen) => {
    if (user.protegido) {
      return;
    }
    try {
      await usuarioApi.eliminar(user.id);
      fetchUsuarios();
    } catch (err: any) {
      setAviso('Error al dar de baja el usuario: ' + (err?.problemDetail?.detail || err?.message));
    }
  };

  // Handle Reactivate User
  const handleReactivateUser = async (user: UsuarioResumen) => {
    try {
      await usuarioApi.reactivar(user.id);
      fetchUsuarios();
    } catch (err: any) {
      setAviso('Error al reactivar el usuario: ' + (err?.problemDetail?.detail || err?.message));
    }
  };

  // Handle Open Roles Modal
  const handleOpenRoles = (user: UsuarioResumen) => {
    if (user.protegido) {
      return;
    }
    setRolesModalUser(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
    setRolesMessage(null);
  };

  // Save Roles via PUT /admin/usuarios/{id}/roles (numeric IDs payload { roles: [number] })
  const handleSaveRoles = async () => {
    if (!rolesModalUser) return;
    setIsSavingRoles(true);
    setRolesMessage(null);

    try {
      await usuarioApi.updateRoles(rolesModalUser.id, selectedRoleIds);
      setRolesMessage('¡Roles asignados exitosamente!');
      setTimeout(() => {
        setRolesModalUser(null);
        fetchUsuarios();
      }, 1000);
    } catch (err: any) {
      console.error('Error al guardar roles:', err);
      setRolesMessage(err?.problemDetail?.detail || err?.message || 'Error al actualizar roles.');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Strong password validation regex: >=8 chars, >=1 uppercase, >=1 number
  const validateStrongPassword = (pass: string): boolean => {
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pass);
  };

  // Save Reset Password (PUT /admin/usuarios/{id}/password with payload { password: "..." })
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!resetPassUser || !newPassword) return;

    if (resetPassUser.protegido) {
      return;
    }

    if (!validateStrongPassword(newPassword)) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres, al menos una letra mayúscula y al menos un número.');
      return;
    }

    setIsResettingPass(true);
    try {
      await usuarioApi.updatePassword(resetPassUser.id, newPassword);
      setResetSuccess(`La contraseña para ${resetPassUser.username} fue restablecida exitosamente.`);
      setTimeout(() => {
        setResetPassUser(null);
        setNewPassword('');
        setResetSuccess(null);
        setPasswordError(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError('Error al resetear contraseña: ' + (err?.problemDetail?.detail || err?.message || 'Intente nuevamente.'));
    } finally {
      setIsResettingPass(false);
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<UsuarioResumen>[] = [
    {
      key: 'username',
      label: 'Usuario',
      sortable: true,
      render: (u) => (
        <div>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {u.username}
            {u.protegido && (
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
                🔒 Admin Sistema
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
        </div>
      ),
    },
    {
      key: 'persona',
      label: 'Persona Vinculada',
      sortable: true,
      render: (u) => (
        <div>
          <div style={{ fontSize: '0.875rem' }}>{u.persona?.nombreCompleto || 'Sin vincular'}</div>
          {u.persona?.nroDoc && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {u.persona.tipoDoc || 'DOC'}: {u.persona.nroDoc}
            </div>
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
              key={r.id}
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  r.nombre === 'SUPER_USUARIO' || r.nombre === 'ADMINISTRADOR'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : r.nombre === 'ORGANIZADOR'
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(99, 102, 241, 0.15)',
                color:
                  r.nombre === 'SUPER_USUARIO' || r.nombre === 'ADMINISTRADOR'
                    ? '#f87171'
                    : r.nombre === 'ORGANIZADOR'
                    ? 'var(--accent-secondary)'
                    : 'var(--accent-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {r.nombreAmigable || r.nombre}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'estado', label: 'Estado', sortable: true },
    {
      key: 'creadoEn',
      label: 'Fecha Registro',
      sortable: true,
      render: (u) => (u.creadoEn ? new Date(u.creadoEn).toLocaleDateString() : '-'),
    },
  ];

  // Custom Row Actions: Roles & Password Reset
  const renderCustomRowActions = (user: UsuarioResumen) => (
    <>
      <button
        type="button"
        title="Gestionar Roles (PUT /admin/usuarios/{id}/roles)"
        onClick={() => handleOpenRoles(user)}
        disabled={user.protegido}
        style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: 'var(--accent-secondary)',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: user.protegido ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          opacity: user.protegido ? 0.5 : 1,
        }}
      >
        🛡️ Roles
      </button>

      <button
        type="button"
        title="Resetear Contraseña (PUT /admin/usuarios/{id}/password)"
        onClick={() => {
          if (user.protegido) {
            return;
          }
          setResetPassUser(user);
          setNewPassword('');
          setPasswordError(null);
          setResetSuccess(null);
        }}
        disabled={user.protegido}
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#f59e0b',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: user.protegido ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          opacity: user.protegido ? 0.5 : 1,
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
          Administración centralizada conectada al contrato OpenAPI del backend (`pica-back`).
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

      <DataTable<UsuarioResumen>
        title="Directorio de Usuarios"
        description="Listado paginado desde el servidor con búsqueda, filtros, roles numéricos y reseteo de claves."
        data={usuarios}
        columns={columns}
        searchFields={['username', 'email']}
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
        onCreate={() => {
          resetCreateForm();
          setIsCreateOpen(true);
        }}
        onEdit={(u) => {
          if (u.protegido) {
            return;
          }
          setEditingUser(u);
          setEditForm({ email: u.email, estado: u.estado === 'BLOQUEADO' ? 'BLOQUEADO' : 'ACTIVO' });
        }}
        onDelete={handleDeleteUser}
        onReactivate={handleReactivateUser}
        customActions={renderCustomRowActions}
        isReadOnly={(u) => u.protegido}
        createButtonText="Alta de Usuario"
      />

      {/* MODAL 1: ALTA DE USUARIO */}
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

            {createFormErrors.server && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {createFormErrors.server}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sección Buscador de Persona con la API */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                  1. Vinculación con Persona (Búsqueda API GET /admin/personas)
                </label>

                {!isInlinePersona ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Ingrese apellido o nro documento..."
                        value={docSearchInput}
                        onChange={(e) => setDocSearchInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: createFormErrors.persona ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSearchPersona}
                        disabled={isSearchingPersona}
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        {isSearchingPersona ? 'Buscando...' : '🔍 Buscar'}
                      </button>
                    </div>

                    {searchError && (
                      <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.4rem' }}>{searchError}</p>
                    )}

                    {foundPersonas.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Seleccione una persona del padrón:</span>
                        {foundPersonas.map((p) => {
                          const isSelected = selectedPersona?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (p.tieneUsuario) return;
                                setSelectedPersona(p);
                                setCreateUserForm((prev) => ({ ...prev, email: prev.email || `${p.nombres.toLowerCase().replace(/\s+/g, '')}@pica.edu.ar` }));
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : p.tieneUsuario ? 'rgba(239,68,68,0.1)' : 'rgba(15,23,42,0.4)',
                                cursor: p.tieneUsuario ? 'not-allowed' : 'pointer',
                                opacity: p.tieneUsuario ? 0.6 : 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.85rem',
                              }}
                            >
                              <div>
                                <strong>{p.nombres} {p.apellidos}</strong> ({p.tipoDoc || 'DOC'}: {p.nroDoc || 'Sin doc'})
                              </div>
                              {p.tieneUsuario ? (
                                <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ Ya tiene usuario</span>
                              ) : isSelected ? (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>✓ Seleccionada</span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {createFormErrors.persona && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>{createFormErrors.persona}</span>
                    )}

                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlinePersona(true);
                          setSelectedPersona(null);
                          setFoundPersonas([]);
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
                        + ¿La persona no existe? Crear persona en línea (POST /admin/personas)
                      </button>
                    </div>
                  </>
                ) : (
                  /* Formulario en Línea para Crear Persona */
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Registro de Persona en Línea (POST /admin/personas)</span>
                      <button
                        type="button"
                        onClick={() => setIsInlinePersona(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Volver al buscador
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
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
                  2. Credenciales de Usuario (POST /admin/usuarios)
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
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contraseña Temporal *</label>
                    <input
                      type="password"
                      placeholder="Contraseña inicial..."
                      value={createUserForm.passwordTemporal}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, passwordTemporal: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.passwordTemporal ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    />
                    {createFormErrors.passwordTemporal && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{createFormErrors.passwordTemporal}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rol Inicial (Opcional)</label>
                    <select
                      value={createUserForm.initialRoleId}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, initialRoleId: Number(e.target.value) })}
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
                      <option value={0}>Sin Rol Inicial</option>
                      {availableRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombreAmigable} (ID: {r.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreatingUser}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Procesando...' : 'Crear Usuario'}
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
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estado</label>
                <select
                  value={editForm.estado}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
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
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingEdit}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ROLES CON CHECKBOXES E IDS NUMÉRICOS (PUT /admin/usuarios/{id}/roles) */}
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
              Llama a <code>PUT /admin/usuarios/{rolesModalUser.id}/roles</code> enviando array de IDs numéricos <code>{`{ roles: [number] }`}</code>.
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {availableRoles.map((r) => {
                const isChecked = selectedRoleIds.includes(r.id);
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
                          setSelectedRoleIds([...selectedRoleIds, r.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter((id) => id !== r.id));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.nombreAmigable} <code>(ID: {r.id}, {r.nombre})</code>
                      </div>
                      {r.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.descripcion}</div>}
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
                {isSavingRoles ? 'Guardando...' : 'Guardar Roles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET DE CONTRASEÑA (PUT /admin/usuarios/{id}/password con { password: "..." } y clave fuerte) */}
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
              Resetear Contraseña (PUT /password)
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

            {passwordError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nueva Contraseña Fuerte *</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número..."
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: passwordError ? '1px solid #ef4444' : '1px solid var(--border-color)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Requisito: Mínimo 8 caracteres, al menos 1 letra mayúscula y 1 número.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const randomPass = `Pica2026#${Math.floor(1000 + Math.random() * 9000)}`;
                  setNewPassword(randomPass);
                  setPasswordError(null);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                ⚡ Generar Clave Temporal Válida (ej: Pica2026#1234)
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetPassUser(null)}
                  disabled={isResettingPass}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isResettingPass}>
                  {isResettingPass ? 'Guardando...' : 'Cambiar Clave (PUT)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
