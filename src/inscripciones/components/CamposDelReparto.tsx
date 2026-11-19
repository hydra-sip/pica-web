import React from 'react';
import { CIEN, RepartoEscrito, textoPct } from '../reparto';

interface CampoPctProps {
  /** De quién es el %: le da nombre al campo. */
  nombre: string;
  valor: string;
  onValor: (valor: string) => void;
  disabled?: boolean;
}

/** El % del premio de un integrante (CR-05): de 0 a 100, con coma o punto y hasta dos decimales. */
export const CampoPct: React.FC<CampoPctProps> = ({ nombre, valor, onValor, disabled }) => (
  <span className="reparto-campo">
    <input
      type="text"
      inputMode="decimal"
      className="input"
      aria-label={`% del premio de ${nombre}`}
      value={valor}
      disabled={disabled}
      onChange={(e) => onValor(e.target.value)}
    />
    <span aria-hidden="true">%</span>
  </span>
);

/** El total del reparto mientras se carga, con el aviso si algún campo no sirve o si no suma 100. */
export const TotalDelReparto: React.FC<{ escrito: RepartoEscrito }> = ({ escrito }) => (
  <>
    <p className="inscripcion-contador">Total del reparto: {textoPct(escrito.total / 100)} %</p>
    {!escrito.camposValidos ? (
      <div className="alerta alerta-peligro" role="alert">
        Cada % va de 0 a 100, con hasta dos decimales.
      </div>
    ) : (
      escrito.total !== CIEN && (
        <div className="alerta alerta-peligro" role="alert">
          El reparto tiene que sumar 100 %: ahora suma {textoPct(escrito.total / 100)} %.
        </div>
      )
    )}
  </>
);
