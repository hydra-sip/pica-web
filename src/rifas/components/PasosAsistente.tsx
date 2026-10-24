import React from 'react';

export interface Paso {
  titulo: string;
  subtitulo: string;
  /** Si no se puede ir todavía (por ejemplo, premios antes de crear la rifa). */
  bloqueado?: boolean;
}

interface PasosAsistenteProps {
  pasos: Paso[];
  /** Índice del paso actual, desde 0. */
  actual: number;
  onIr: (indice: number) => void;
}

/** Barra de pasos numerados del asistente, como la de "Crear Nueva Competencia" en Figma. */
export const PasosAsistente: React.FC<PasosAsistenteProps> = ({ pasos, actual, onIr }) => (
  <ol className="pasos-asistente">
    {pasos.map((paso, i) => {
      const estado = i === actual ? 'actual' : i < actual ? 'hecho' : 'pendiente';
      return (
        <li key={paso.titulo} className={`paso ${estado}`}>
          <button
            type="button"
            onClick={() => onIr(i)}
            disabled={paso.bloqueado || i === actual}
            aria-current={i === actual ? 'step' : undefined}
          >
            <span className="paso-numero">{i + 1}</span>
            <span className="paso-textos">
              <span className="paso-titulo">{paso.titulo}</span>
              <span className="paso-subtitulo">{paso.subtitulo}</span>
            </span>
          </button>
        </li>
      );
    })}
  </ol>
);
