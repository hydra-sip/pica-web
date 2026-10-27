import React from 'react';
import { BracketTorneo, LadoBracket, PartidoBracket } from '../../api/torneoApi';
import { abreviarHash } from '../formato';
import './Bracket.css';

const marcador = (lado: LadoBracket): string =>
  lado.puntaje === null
    ? ''
    : `${lado.puntaje}${lado.penales === null ? '' : ` (${lado.penales})`}`;

const Fila: React.FC<{ lado: LadoBracket | null; vacio: string }> = ({ lado, vacio }) =>
  lado ? (
    <div className={`bracket-lado${lado.ganador ? ' bracket-lado-ganador' : ''}`}>
      <span className="bracket-nombre">{lado.nombre}</span>
      <span className="bracket-puntaje">{marcador(lado)}</span>
    </div>
  ) : (
    <div className="bracket-lado bracket-lado-vacio">{vacio}</div>
  );

const Partido: React.FC<{ partido: PartidoBracket }> = ({ partido }) => (
  <div className={`bracket-partido${partido.bye ? ' bracket-partido-bye' : ''}`}>
    {partido.bye ? (
      <>
        <div className="bracket-lado bracket-lado-ganador">
          <span className="bracket-nombre">{partido.local?.nombre}</span>
          <span className="bracket-bye">BYE →</span>
        </div>
        <div className="bracket-lado bracket-lado-vacio">Sin rival (avanza)</div>
      </>
    ) : (
      <>
        <Fila lado={partido.local} vacio="A definir" />
        <Fila lado={partido.visitante} vacio="A definir" />
      </>
    )}
  </div>
);

/**
 * El bracket de eliminación directa (HU-207), compartido por la consola del organizador y la ficha pública: una
 * columna por ronda, de la primera a la final. En un celular se desliza de costado dentro de su caja.
 */
export const Bracket: React.FC<{ bracket: BracketTorneo }> = ({ bracket }) => (
  <div className="bracket">
    <div className="bracket-rondas">
      {bracket.rondas.map((ronda) => (
        <section key={ronda.numero} className="bracket-ronda" aria-label={ronda.nombre}>
          <h3>{ronda.nombre}</h3>
          <div className="bracket-partidos">
            {ronda.partidos.map((p) => (
              <Partido key={p.id} partido={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
    {bracket.semilla && (
      <p className="bracket-semilla">
        Sorteado con la semilla <code title={bracket.semilla}>{abreviarHash(bracket.semilla)}</code>
        {bracket.listaHash && (
          <>
            {' '}
            sobre la lista <code title={bracket.listaHash}>{abreviarHash(bracket.listaHash)}</code>
          </>
        )}
        .
      </p>
    )}
  </div>
);
