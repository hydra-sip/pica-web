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

/**
 * Un lado que avanza sin jugar, en su lugar, y el otro vacío: el BYE del sorteo y el pase directo (HU-309), que puede
 * llegar por el local o por el visitante.
 */
const SinRival: React.FC<{ partido: PartidoBracket; chip: string; vacio: string }> = ({
  partido,
  chip,
  vacio,
}) => {
  const avanza = (
    <div className="bracket-lado bracket-lado-ganador">
      <span className="bracket-nombre">{(partido.local ?? partido.visitante)?.nombre}</span>
      <span className="bracket-bye">{chip}</span>
    </div>
  );
  const vacante = <div className="bracket-lado bracket-lado-vacio">{vacio}</div>;
  return partido.local ? (
    <>
      {avanza}
      {vacante}
    </>
  ) : (
    <>
      {vacante}
      {avanza}
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
  if (partido.bye) return <SinRival partido={partido} chip="BYE →" vacio="Sin rival (avanza)" />;
  if (cierre === 'PASE_DIRECTO') {
    return <SinRival partido={partido} chip="Pase directo →" vacio="Vacante (sin presentes)" />;
  }
  if (cierre) return <PorAusencia partido={partido} descalificados={cierre === 'DESCALIFICADOS'} />;
  return (
    <>
      <Fila lado={partido.local} vacio="A definir" />
      <Fila lado={partido.visitante} vacio="A definir" />
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
