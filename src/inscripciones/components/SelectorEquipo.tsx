import React from 'react';
import { Field, Input, Select } from '../../shared/ui';
import { EquipoElegible } from '../hooks/useEquiposDelTorneo';

/** Valor del selector para "crear un equipo nuevo". */
export const EQUIPO_NUEVO = 'nuevo';

interface SelectorEquipoProps {
  /** null mientras carga. */
  equipos: EquipoElegible[] | null;
  /** Id del equipo elegido (como texto), `EQUIPO_NUEVO` o '' si todavía no eligió. */
  valor: string;
  onValor: (valor: string) => void;
  nombreNuevo: string;
  onNombreNuevo: (nombre: string) => void;
  disabled?: boolean;
}

/** Equipo propio o nombre nuevo: exactamente uno de los dos (como pide el back). */
export const SelectorEquipo: React.FC<SelectorEquipoProps> = ({
  equipos,
  valor,
  onValor,
  nombreNuevo,
  onNombreNuevo,
  disabled,
}) => {
  if (!equipos) return <p className="inscripcion-cargando">Cargando tus equipos...</p>;

  const sinEquipos = equipos.length === 0;
  const creaNuevo = sinEquipos || valor === EQUIPO_NUEVO;

  return (
    <div className="inscripcion-bloque">
      {sinEquipos ? (
        <p className="inscripcion-ayuda">
          Todavía no tenés equipos: poné un nombre y lo creamos con tu inscripción.
        </p>
      ) : (
        <Field
          label="Equipo"
          hint="Si un equipo ya está inscripto en este torneo no se puede elegir."
        >
          <Select value={valor} onChange={(e) => onValor(e.target.value)} disabled={disabled}>
            <option value="" disabled>
              Elegí uno de tus equipos
            </option>
            {equipos.map((e) => (
              <option key={e.id} value={String(e.id)} disabled={e.inscripto}>
                {e.inscripto ? `${e.nombre} (ya tiene una inscripción en este torneo)` : e.nombre}
              </option>
            ))}
            <option value={EQUIPO_NUEVO}>Crear un equipo nuevo</option>
          </Select>
        </Field>
      )}
      {creaNuevo && (
        <Field label="Nombre del equipo nuevo">
          <Input
            value={nombreNuevo}
            onChange={(e) => onNombreNuevo(e.target.value)}
            maxLength={100}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
      )}
    </div>
  );
};
