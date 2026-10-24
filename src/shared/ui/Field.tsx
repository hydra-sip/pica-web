import React, { createContext, useContext, useId } from 'react';

interface FieldContextValue {
  id: string;
  invalid: boolean;
  describedBy?: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  // Si no se pasa, se genera uno; el control lo toma del contexto
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + ayuda o error. El Input/Select/Textarea de adentro toma el id, aria-invalid
 * y aria-describedby del Field, así el lector de pantalla lee el error junto con el campo.
 */
export const Field: React.FC<FieldProps> = ({ label, required, hint, error, id, className, children }) => {
  const generado = useId();
  const controlId = id ?? generado;
  const mensajeId = `${controlId}-mensaje`;
  const mensaje = error || hint;

  return (
    <FieldContext.Provider value={{ id: controlId, invalid: !!error, describedBy: mensaje ? mensajeId : undefined }}>
      <div className={['field', className].filter(Boolean).join(' ')}>
        <label className="field-label" htmlFor={controlId}>
          {label}
          {required && (
            <span className="field-requerido" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
        {children}
        {mensaje && (
          <span id={mensajeId} className={error ? 'field-error' : 'field-ayuda'} role={error ? 'alert' : undefined}>
            {mensaje}
          </span>
        )}
      </div>
    </FieldContext.Provider>
  );
};

function useControlProps<P extends { id?: string; className?: string; 'aria-invalid'?: unknown; 'aria-describedby'?: string }>(
  props: P
) {
  const field = useContext(FieldContext);
  return {
    ...props,
    id: props.id ?? field?.id,
    className: ['input', props.className].filter(Boolean).join(' '),
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
  };
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input ref={ref} {...useControlProps(props)} />
));
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => <select ref={ref} {...useControlProps(props)} />
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <textarea ref={ref} {...useControlProps(props)} />
);
Textarea.displayName = 'Textarea';
