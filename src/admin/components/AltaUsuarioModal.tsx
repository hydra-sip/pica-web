import React, { useState } from 'react';
import { usuarioApi } from '../../api/usuarioApi';
import { personaApi, PersonaResumen } from '../../api/personaApi';
import { RolResumen } from '../../api/rolApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { validateNombreApellido, validateDocumento } from '../../shared/validators';
import { IconoBuscar } from '../../shared/ui/Iconos';

const TIPOS_DOC = ['DNI', 'LC', 'LE', 'CI', 'PASAPORTE'];

// En el alta con persona en línea, los errores de la persona se marcan en sus campos
const CAMPO_PERSONA_EN_LINEA: Record<string, string> = {
  nombres: 'inlineNombres',
  apellidos: 'inlineApellidos',
  nroDoc: 'inlineDoc',
};

interface AltaUsuarioModalProps {
  roles: RolResumen[];
  puedeCrearPersona: boolean;
  onClose: () => void;
  onCreado: () => void;
}

/**
 * Alta de un usuario: se vincula a una persona del padrón (buscándola) o a una que se crea en línea, y lleva sus
 * credenciales y un rol inicial opcional. Cada vez que se abre arranca vacío.
 */
export const AltaUsuarioModal: React.FC<AltaUsuarioModalProps> = ({
  roles,
  puedeCrearPersona,
  onClose,
  onCreado,
}) => {
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
        setSearchError(
          `No se encontraron personas con el criterio "${docSearchInput}". Podés crearla en línea a continuación.`
        );
      }
    } catch (err) {
      setSearchError(mensajeDeError(err, 'Error al buscar personas.'));
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
      const errNombres = validateNombreApellido(inlinePersonaData.nombres, 'El nombre', true);
      if (errNombres) errors.inlineNombres = errNombres;
      const errApellidos = validateNombreApellido(inlinePersonaData.apellidos, 'El apellido', true);
      if (errApellidos) errors.inlineApellidos = errApellidos;
      const errDoc = validateDocumento(inlinePersonaData.nroDoc, inlinePersonaData.tipoDoc, true);
      if (errDoc) errors.inlineDoc = errDoc;
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
        const creada = await personaApi.crear({
          nombres: inlinePersonaData.nombres.trim(),
          apellidos: inlinePersonaData.apellidos.trim(),
          tipoDoc: inlinePersonaData.tipoDoc,
          nroDoc: inlinePersonaData.nroDoc.trim(),
          telefono: inlinePersonaData.telefono.trim() || undefined,
        });
        // Si después falla el alta del usuario, la persona ya existe: queda elegida para reintentar
        const persona: PersonaResumen = {
          id: creada.id,
          nombres: creada.nombres,
          apellidos: creada.apellidos,
          tipoDoc: creada.tipoDoc,
          nroDoc: creada.nroDoc,
          estado: creada.estado,
          eliminado: false,
          tieneUsuario: false,
        };
        setSelectedPersona(persona);
        setFoundPersonas([persona]);
        setIsInlinePersona(false);
        targetPersonaId = persona.id;
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

      onCreado();
    } catch (err) {
      const errors: Record<string, string> = {};
      Object.entries(erroresPorCampo(err)).forEach(([campo, mensaje]) => {
        errors[CAMPO_PERSONA_EN_LINEA[campo] ?? campo] = mensaje;
      });
      setCreateFormErrors({
        ...errors,
        server: mensajeDeError(err, 'No se pudo dar de alta el usuario.'),
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={() => onClose()}
    >
      <div
        className="card"
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
            onClick={() => onClose()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        {createFormErrors.server && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {createFormErrors.server}
          </div>
        )}

        <form
          onSubmit={handleCreateSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Sección Buscador de Persona con la API */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <label
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}
            >
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
                      border: createFormErrors.persona
                        ? '1px solid var(--color-danger)'
                        : '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSearchPersona}
                    disabled={isSearchingPersona}
                    style={{
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <IconoBuscar size={14} />
                    <span>{isSearchingPersona ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>

                {searchError && (
                  <p
                    style={{
                      color: 'var(--color-danger)',
                      fontSize: '0.8rem',
                      marginTop: '0.4rem',
                    }}
                  >
                    {searchError}
                  </p>
                )}

                {foundPersonas.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Seleccione una persona del padrón:
                    </span>
                    {foundPersonas.map((p) => {
                      const isSelected = selectedPersona?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (p.tieneUsuario) return;
                            setSelectedPersona(p);
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected
                              ? '1px solid var(--color-primary)'
                              : '1px solid var(--color-border)',
                            backgroundColor: isSelected
                              ? 'var(--color-surface)'
                              : p.tieneUsuario
                                ? 'var(--color-danger-bg)'
                                : 'var(--color-surface)',
                            cursor: p.tieneUsuario ? 'not-allowed' : 'pointer',
                            opacity: p.tieneUsuario ? 0.6 : 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div>
                            <strong>
                              {p.nombres} {p.apellidos}
                            </strong>{' '}
                            ({p.tipoDoc || 'DOC'}: {p.nroDoc || 'Sin doc'})
                          </div>
                          {p.tieneUsuario ? (
                            <span
                              style={{
                                color: 'var(--color-danger)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              Ya tiene usuario
                            </span>
                          ) : isSelected ? (
                            <span
                              style={{
                                color: 'var(--color-success)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              Seleccionada
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {createFormErrors.persona && (
                  <span
                    style={{
                      color: 'var(--color-danger)',
                      fontSize: '0.75rem',
                      marginTop: '0.3rem',
                      display: 'block',
                    }}
                  >
                    {createFormErrors.persona}
                  </span>
                )}

                {puedeCrearPersona && (
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
                        color: 'var(--color-primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      + ¿La persona no existe? Crear persona en línea (POST /admin/personas)
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Formulario en Línea para Crear Persona */
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}
                  >
                    Registro de Persona en Línea (POST /admin/personas)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsInlinePersona(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Volver al buscador
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <input
                      type="text"
                      placeholder="Nombres *"
                      value={inlinePersonaData.nombres}
                      onChange={(e) =>
                        setInlinePersonaData({ ...inlinePersonaData, nombres: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.inlineNombres
                          ? '1px solid var(--color-danger)'
                          : '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-input-bg)',
                        color: 'var(--color-text)',
                        fontSize: '0.8rem',
                      }}
                    />
                    {createFormErrors.inlineNombres && (
                      <span
                        style={{
                          color: 'var(--color-danger)',
                          fontSize: '0.72rem',
                          marginTop: '0.15rem',
                          display: 'block',
                        }}
                      >
                        {createFormErrors.inlineNombres}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Apellidos *"
                      value={inlinePersonaData.apellidos}
                      onChange={(e) =>
                        setInlinePersonaData({
                          ...inlinePersonaData,
                          apellidos: e.target.value,
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.inlineApellidos
                          ? '1px solid var(--color-danger)'
                          : '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-input-bg)',
                        color: 'var(--color-text)',
                        fontSize: '0.8rem',
                      }}
                    />
                    {createFormErrors.inlineApellidos && (
                      <span
                        style={{
                          color: 'var(--color-danger)',
                          fontSize: '0.72rem',
                          marginTop: '0.15rem',
                          display: 'block',
                        }}
                      >
                        {createFormErrors.inlineApellidos}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '0.5rem',
                    alignItems: 'start',
                  }}
                >
                  <select
                    value={inlinePersonaData.tipoDoc}
                    onChange={(e) =>
                      setInlinePersonaData({ ...inlinePersonaData, tipoDoc: e.target.value })
                    }
                    style={{
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div>
                    <input
                      type="text"
                      placeholder="Nro Documento *"
                      value={inlinePersonaData.nroDoc}
                      onChange={(e) =>
                        setInlinePersonaData({ ...inlinePersonaData, nroDoc: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        border: createFormErrors.inlineDoc
                          ? '1px solid var(--color-danger)'
                          : '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-input-bg)',
                        color: 'var(--color-text)',
                        fontSize: '0.8rem',
                      }}
                    />
                    {createFormErrors.inlineDoc && (
                      <span
                        style={{
                          color: 'var(--color-danger)',
                          fontSize: '0.72rem',
                          marginTop: '0.15rem',
                          display: 'block',
                        }}
                      >
                        {createFormErrors.inlineDoc}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección Datos de Cuenta de Usuario */}
          <div>
            <label
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}
            >
              2. Credenciales de Usuario (POST /admin/usuarios)
            </label>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  placeholder="ej. jorganizador"
                  value={createUserForm.username}
                  onChange={(e) =>
                    setCreateUserForm({ ...createUserForm, username: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: createFormErrors.username
                      ? '1px solid var(--color-danger)'
                      : '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                  }}
                />
                {createFormErrors.username && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                    {createFormErrors.username}
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  placeholder="ej. usuario@pica.edu.ar"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: createFormErrors.email
                      ? '1px solid var(--color-danger)'
                      : '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                  }}
                />
                {createFormErrors.email && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                    {createFormErrors.email}
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Contraseña Temporal *
                </label>
                <input
                  type="password"
                  placeholder="Contraseña inicial..."
                  value={createUserForm.passwordTemporal}
                  onChange={(e) =>
                    setCreateUserForm({ ...createUserForm, passwordTemporal: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: createFormErrors.passwordTemporal
                      ? '1px solid var(--color-danger)'
                      : '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                  }}
                />
                {createFormErrors.passwordTemporal && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                    {createFormErrors.passwordTemporal}
                  </span>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Rol Inicial (Opcional)
                </label>
                <select
                  value={createUserForm.initialRoleId}
                  onChange={(e) =>
                    setCreateUserForm({
                      ...createUserForm,
                      initialRoleId: Number(e.target.value),
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value={0}>Sin Rol Inicial</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombreAmigable} (ID: {r.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
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
  );
};
