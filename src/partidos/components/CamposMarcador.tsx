import React from 'react';
import { Field, Input } from '../../shared/ui';
import { Marcador, esEmpate } from '../marcador';

interface CamposMarcadorProps {
  marcador: Marcador;
  errores: Record<string, string>;
  nombreLocal?: string;
  nombreVisitante?: string;
  onChange: (marcador: Marcador) => void;
  /** En la fase de grupos (CR-02) se puede empatar: no hay penales. */
  conEmpate?: boolean;
}

/** Los dos puntajes enfrentados y, si empatan, los penales. Lo usan la carga y la objeción. */
export const CamposMarcador: React.FC<CamposMarcadorProps> = ({
  marcador,
  errores,
  nombreLocal,
  nombreVisitante,
  onChange,
  conEmpate = false,
}) => {
  const campo = (nombre: keyof Marcador, label: React.ReactNode, error: string | undefined) => (
    <Field label={label} error={error}>
      <Input
        type="number"
        min={0}
        inputMode="numeric"
        value={marcador[nombre]}
        onChange={(e) => onChange({ ...marcador, [nombre]: e.target.value })}
      />
    </Field>
  );

  return (
    <>
      <div className="partido-marcador">
        {campo('local', nombreLocal, errores.puntajeLocal)}
        <span className="partido-guion" aria-hidden="true">
          -
        </span>
        {campo('visitante', nombreVisitante, errores.puntajeVisitante)}
      </div>
      {esEmpate(marcador) && !conEmpate && (
        <div className="partido-marcador">
          {campo('penalesLocal', 'Penales local', errores.penalesLocal)}
          <span className="partido-guion" aria-hidden="true">
            -
          </span>
          {campo('penalesVisitante', 'Penales visitante', errores.penalesVisitante)}
        </div>
      )}
    </>
  );
};
