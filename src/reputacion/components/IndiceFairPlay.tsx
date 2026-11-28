import React, { useId, useState } from 'react';
import '../reputacion.css';

type Rango = 'alto' | 'medio' | 'bajo';

/** Los cortes del color, sobre el índice de 100 con el que arranca cada jugador. */
export const rangoFairPlay = (valor: number): Rango =>
  valor >= 80 ? 'alto' : valor >= 50 ? 'medio' : 'bajo';

const ANCHO_TOOLTIP = 288;

const COMO_SE_CALCULA =
  'Arranca en 100. Sube con cada check-in a tiempo, sin pasar del máximo, y baja con cada ausencia sin aviso y con cada sanción, más cuanto más grave. Nunca baja de 0. Los puntos los define la plataforma.';

interface IndiceFairPlayProps {
  valor: number;
  /** En la tarjeta del perfil, más grande. */
  grande?: boolean;
}

/**
 * HU-802 (T802-2): el índice de fair play con un color por rango (verde de 80 para arriba, amarillo de 50 a 79,
 * rojo debajo de 50) y un tooltip que explica cómo se calcula.
 */
export const IndiceFairPlay: React.FC<IndiceFairPlayProps> = ({ valor, grande = false }) => {
  const ayuda = useId();
  const rango = rangoFairPlay(valor);
  // fijo a la ventana: dentro de una tabla con scroll, uno absoluto queda cortado
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);

  const mostrar = (e: React.SyntheticEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const visible = document.documentElement.clientWidth || window.innerWidth;
    const ancho = Math.min(ANCHO_TOOLTIP, visible - 16);
    setPosicion({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.left, visible - ancho - 8)),
    });
  };
  const ocultar = () => setPosicion(null);
  return (
    <span className={`indice-fair-play${grande ? ' indice-fair-play-grande' : ''}`}>
      <span className={`indice-valor indice-${rango}`} aria-label={`Fair play ${valor}, ${rango}`}>
        {valor}
      </span>
      <button
        type="button"
        className="indice-ayuda"
        aria-label="Cómo se calcula el fair play"
        aria-describedby={ayuda}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
        onKeyDown={(e) => e.key === 'Escape' && ocultar()}
      >
        ?
      </button>
      <span
        role="tooltip"
        id={ayuda}
        className="indice-tooltip"
        hidden={!posicion}
        style={posicion ?? undefined}
      >
        {COMO_SE_CALCULA}
      </span>
    </span>
  );
};
