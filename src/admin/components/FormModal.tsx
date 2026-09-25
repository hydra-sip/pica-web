import React, { useEffect, useState } from 'react';

export interface FormFieldOption {
  value: string | number;
  label: string;
}

export interface FormFieldSchema {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'select' | 'textarea' | 'checkbox' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  readOnlyInEdit?: boolean;
  validate?: (value: any, formData: Record<string, any>) => string | null;
}

interface FormModalProps<T extends Record<string, any>> {
  isOpen: boolean;
  title: string;
  mode: 'view' | 'edit' | 'create';
  fields: FormFieldSchema[];
  initialData?: Partial<T>;
  onClose: () => void;
  onSubmit: (data: T) => Promise<void> | void;
}

export function FormModal<T extends Record<string, any>>({
  isOpen,
  title,
  mode,
  fields,
  initialData = {},
  onClose,
  onSubmit,
}: FormModalProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const val = formData[field.name];

      if (field.required && (val === undefined || val === null || val === '')) {
        newErrors[field.name] = `El campo ${field.label} es obligatorio.`;
      } else if (field.type === 'email' && val && !/\S+@\S+\.\S+/.test(String(val))) {
        newErrors[field.name] = 'El correo electrónico no es válido.';
      } else if (field.validate) {
        const customErr = field.validate(val, formData);
        if (customErr) {
          newErrors[field.name] = customErr;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(formData as T);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      const validationErrors = err?.problemDetail?.errores || err?.errores;
      if (validationErrors && Array.isArray(validationErrors)) {
        const fieldErrs: Record<string, string> = {};
        validationErrors.forEach((item: { campo: string; mensaje: string }) => {
          if (item.campo) fieldErrs[item.campo] = item.mensaje;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrs }));
      }
      setServerError(
        err?.problemDetail?.detail ||
        err?.problemDetail?.title ||
        err?.detail ||
        err?.message ||
        'Ocurrió un error al guardar los datos.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (fieldName: string): React.CSSProperties => ({
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    border: errors[fieldName]
      ? '1px solid #ef4444'
      : '1px solid var(--border-color)',
    backgroundColor: isReadOnly ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.6)',
    color: isReadOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: isReadOnly ? 'not-allowed' : 'text',
  });

  return (
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
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{title}</h3>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-secondary)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {mode === 'view' ? 'Modo Lectura' : mode === 'edit' ? 'Modo Edición' : 'Nuevo Registro'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {serverError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fields.map((field) => {
              const disabled = isReadOnly || (mode === 'edit' && field.readOnlyInEdit);
              const val = formData[field.name] ?? '';

              return (
                <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {field.label} {field.required && !isReadOnly && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={val}
                      disabled={disabled}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={{ ...inputStyle(field.name), cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                      <option value="" disabled>
                        Seleccionar...
                      </option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={val}
                      disabled={disabled}
                      placeholder={field.placeholder}
                      rows={3}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={inputStyle(field.name)}
                    />
                  ) : field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        disabled={disabled}
                        onChange={(e) => handleChange(field.name, e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                      />
                      <span style={{ fontSize: '0.9rem' }}>{field.placeholder || 'Habilitado'}</span>
                    </label>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={val}
                      disabled={disabled}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={inputStyle(field.name)}
                    />
                  )}

                  {/* Field-level inline error */}
                  {errors[field.name] && (
                    <span style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.15rem' }}>
                      {errors[field.name]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.875rem' }}
            >
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </button>

            {!isReadOnly && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ padding: '0.5rem 1.35rem', fontSize: '0.875rem' }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
