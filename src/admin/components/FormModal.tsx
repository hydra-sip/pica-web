import React, { useEffect, useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '../../shared/ui';

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
  min?: string;
  max?: string;
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

  const modo = mode === 'view' ? 'Modo lectura' : mode === 'edit' ? 'Modo edición' : 'Nuevo registro';

  return (
    <Modal
      isOpen={isOpen}
      title={
        <>
          {title}
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginTop: '0.2rem' }}>
            {modo}
          </span>
        </>
      }
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      {serverError && (
        <div className="alerta alerta-peligro" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {fields.map((field) => {
            const disabled = isReadOnly || (mode === 'edit' && field.readOnlyInEdit);
            const val = formData[field.name] ?? '';

            if (field.type === 'checkbox') {
              return (
                <div key={field.name} className="field">
                  <span className="field-label">{field.label}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      disabled={disabled}
                      onChange={(e) => handleChange(field.name, e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontSize: 'var(--text-md)' }}>{field.placeholder || 'Habilitado'}</span>
                  </label>
                  {errors[field.name] && <span className="field-error">{errors[field.name]}</span>}
                </div>
              );
            }

            return (
              <Field key={field.name} label={field.label} required={field.required && !isReadOnly} error={errors[field.name]}>
                {field.type === 'select' ? (
                  <Select value={val} disabled={disabled} onChange={(e) => handleChange(field.name, e.target.value)}>
                    <option value="" disabled>
                      Seleccionar...
                    </option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    value={val}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    rows={3}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                ) : (
                  <Input
                    type={field.type || 'text'}
                    value={val}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </div>

        <div className="modal-pie">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
