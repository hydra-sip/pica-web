import React from 'react';
import { Link } from 'react-router-dom';
import { BracketTorneo, LadoBracket, PartidoBracket } from '../../api/torneoApi';
import { cierrePorAusencia } from '../../partidos/formato';
import { abreviarHash } from '../formato';
import './Bracket.css';

const marcador = (lado: LadoBracket): string =>
  lado.puntaje === null
    ? ''
    : `${lado.puntaje}${lado.penales === null ? '' : ` (${lado.penales})`}`;

/** En un partido cerrado por ausencia, la marca de un lado va donde iría su marcador. */
const Fila: React.FC<{
  lado: LadoBracket | null;
  vacio: string;
  marca?: string;
  descalificado?: boolean;
}> = ({ lado, vacio, marca, descalificado = false }) =>
  lado ? (
    <div
      className={`bracket-lado${lado.ganador ? ' bracket-lado-ganador' : ''}${descalificado ? ' bracket-lado-descalificado' : ''}`}
    >
      <span className="bracket-nombre">{lado.nombre}</span>
      <span className={marca ? 'bracket-marca' : 'bracket-puntaje'}>{marca ?? marcador(lado)}</span>
    </div>
  ) : (
    <div className="bracket-lado bracket-lado-vacio">{vacio}</div>
  );

/** El que pasa sin jugar, en su lugar, y el lugar vacante, como en un BYE. */
const PaseDirecto: React.FC<{ partido: PartidoBracket }> = ({ partido }) => {
  const pasa = (
    <div className="bracket-lado bracket-lado-ganador">
      <span className="bracket-nombre">{(partido.local ?? partido.visitante)?.nombre}</span>
      <span className="bracket-bye">Pase directo →</span>
    </div>
  );
  const vacante = <div className="bracket-lado bracket-lado-vacio">Vacante (sin presentes)</div>;
  return partido.local ? (
    <>
      {pasa}
      {vacante}
    </>
  ) : (
    <>
      {vacante}
      {pasa}
    </>
  );
};

/** Walkover: "W.O." en el que se presentó y "Ausente" en el otro. Descalificados: los dos atenuados. */
const PorAusencia: React.FC<{ partido: PartidoBracket; descalificados: boolean }> = ({
  partido,
  descalificados,
}) => {
  const marca = (lado: LadoBracket | null) =>
    descalificados ? 'Descalificado' : lado?.ganador ? 'W.O.' : 'Ausente';
  return (
    <>
      <Fila
        lado={partido.local}
        vacio="A definir"
        marca={marca(partido.local)}
        descalificado={descalificados}
      />
      <Fila
        lado={partido.visitante}
        vacio="A definir"
        marca={marca(partido.visitante)}
        descalificado={descalificados}
      />
    </>
  );
};

const Partido: React.FC<{ partido: PartidoBracket }> = ({ partido }) => {
  const cierre = cierrePorAusencia(partido);
  if (cierre === 'PASE_DIRECTO') return <PaseDirecto partido={partido} />;
  if (cierre) return <PorAusencia partido={partido} descalificados={cierre === 'DESCALIFICADOS'} />;
  return (
    <>
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
    </>
  );
};

/**
 * El bracket de eliminación directa (HU-207), compartido por la consola del organizador y la ficha pública: una
 * columna por ronda, de la primera a la final. En un celular se desliza de costado dentro de su caja. En la consola
 * cada partido lleva a su pantalla, donde se ve el resultado y se resuelven las objeciones (HU-304), y abajo, fuera
 * del enlace, lleva su `pie`: la programación (HU-308).
 */
export const Bracket: React.FC<{
  bracket: BracketTorneo;
  conEnlaces?: boolean;
  pie?: (partido: PartidoBracket) => React.ReactNode;
}> = ({ bracket, conEnlaces = false, pie }) => (
  <div className="bracket">
    <div className="bracket-rondas">
      {bracket.rondas.map((ronda) => (
        <section key={ronda.numero} className="bracket-ronda" aria-label={ronda.nombre}>
          <h3>{ronda.nombre}</h3>
          <div className="bracket-partidos">
            {ronda.partidos.map((p) => {
              const clases = `bracket-partido${p.bye ? ' bracket-partido-bye' : ''}`;
              const partido =
                conEnlaces && !p.bye ? (
                  <Link
                    key={p.id}
                    to={`/partidos/${p.id}`}
                    className={`${clases} bracket-partido-enlace`}
                  >
                    <Partido partido={p} />
                  </Link>
                ) : (
                  <div key={p.id} className={clases}>
                    <Partido partido={p} />
                  </div>
                );
              return pie ? (
                <div key={p.id} className="bracket-celda">
                  {partido}
                  {pie(p)}
                </div>
              ) : (
                partido
              );
            })}
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
