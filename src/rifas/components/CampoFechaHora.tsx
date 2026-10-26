import React from 'react';
import { Field, Input } from '../../shared/ui';

interface CampoFechaHoraProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Formato de <input type="datetime-local">: `2026-11-30T18:30`, o vacío. */
  value: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}

const HORA_POR_DEFECTO = '00:00';

/**
 * Fecha con día y hora en dos campos: la hora viene en 00:00, así alcanza con elegir el día. Un
 * datetime-local no deja precargar solo la hora (sin hora queda vacío), por eso van separados.
 */
export const CampoFechaHora: React.FC<CampoFechaHoraProps> = ({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  disabled,
}) => {
  const [dia, hora] = value ? value.split('T') : ['', ''];

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="rifas-fecha-hora">
        <Input
          type="date"
          value={dia}
          onChange={(e) =>
            onChange(e.target.value ? `${e.target.value}T${hora || HORA_POR_DEFECTO}` : '')
          }
          disabled={disabled}
        />
        <Input
          id={`${id}-hora`}
          type="time"
          aria-label={`Hora de: ${label}`}
          value={dia ? hora || HORA_POR_DEFECTO : HORA_POR_DEFECTO}
          // Sin día no hay fecha: la hora se usa cuando se elige el día
          onChange={(e) => dia && onChange(`${dia}T${e.target.value || HORA_POR_DEFECTO}`)}
          disabled={disabled}
        />
      </div>
    </Field>
  );
};
