import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CriterioPuesto,
  GrupoDelTorneo,
  GruposTorneo,
  PartidoBracket,
  torneoApi,
} from '../../api/torneoApi';
import { Badge } from '../../shared/ui';
import { mensajeDeError } from '../../shared/mensajesError';
import { Partido } from './Bracket';

/** Por qué quedó en ese puesto, para mostrarlo al lado de la fila. */
export const CRITERIO_UI: Record<CriterioPuesto, string> = {
  PUNTOS: 'por puntos',
  ENTRE_SI: 'por resultado entre sí',
  GANADOS: 'por partidos ganados',
  DESEMPATE: 'por partido de desempate',
  EMPATE: 'empatado',
};

interface GruposDelTorneoProps {
  torneoId: number;
  /** En la consola: cada partido lleva a su pantalla, donde se carga el resultado. */
  conEnlaces?: boolean;
  /** Debajo de cada partido, fuera del enlace: en la consola, la programación. */
  pie?: (partido: PartidoBracket) => React.ReactNode;
  /** Cambia cuando hay que volver a pedir los grupos: un resultado nuevo, una fecha programada. */
  version?: unknown;
  /** Los grupos tal como llegaron, para quien los muestra al lado (los partidos sin fecha, por ejemplo). */
  onCargados?: (grupos: GruposTorneo) => void;
}

/**
 * La fase de grupos (CR-02), compartida por la consola y la ficha pública: por grupo, su tabla (con quiénes pasan y
 * por qué quedó cada uno donde quedó) y sus partidos por fecha; si hubo, el partido de desempate. Sin sortear, un
 * aviso.
 */
export const GruposDelTorneo: React.FC<GruposDelTorneoProps> = ({
  torneoId,
  conEnlaces = false,
  pie,
  version,
  onCargados,
}) => {
  const [grupos, setGrupos] = useState<GruposTorneo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    torneoApi
      .grupos(torneoId)
      .then((g) => {
        if (!vigente) return;
        setGrupos(g);
        setError(null);
        onCargados?.(g);
      })
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los grupos.'))
      );
    return () => {
      vigente = false;
    };
    // onCargados es un callback del padre: no hace falta volver a pedir si cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId, version]);

  if (error) {
    return (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    );
  }
  if (!grupos) return <p className="torneos-vacio">Cargando grupos...</p>;
  if (grupos.grupos.length === 0) {
    return (
      <p className="torneos-vacio">
        Los grupos se sortean al cerrar la inscripción, con una semilla de drand que nadie elige.
      </p>
    );
  }

  const { reglas } = grupos;
  return (
    <div className="grupos">
      <p className="torneos-subtitulo">
        Grupos de {reglas.tamanioGrupo}, pasan {reglas.clasificanPorGrupo} por grupo.{' '}
        {reglas.puntosVictoria} puntos por ganar y {reglas.puntosEmpate} por empatar. Desempate:
        puntos, resultado entre sí, partidos ganados y, si sigue, partido de desempate.
      </p>
      {grupos.grupos.map((grupo) => (
        <Grupo key={grupo.letra} grupo={grupo} conEnlaces={conEnlaces} pie={pie} />
      ))}
    </div>
  );
};

const Grupo: React.FC<{
  grupo: GrupoDelTorneo;
  conEnlaces: boolean;
  pie?: (partido: PartidoBracket) => React.ReactNode;
}> = ({ grupo, conEnlaces, pie }) => {
  const fechas = [...new Set(grupo.partidos.map((p) => p.ronda))].sort((a, b) => a - b);
  return (
    <section className="grupos-grupo" aria-label={`Grupo ${grupo.letra}`}>
      <div className="torneos-tarjeta-titulo">
        <h3>Grupo {grupo.letra}</h3>
        <Badge tone={grupo.terminado ? 'neutral' : 'info'}>
          {grupo.terminado ? 'Terminado' : 'En juego'}
        </Badge>
      </div>

      <div className="grupos-tabla-caja">
        <table className="grupos-tabla">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Participante</th>
              <th scope="col" title="Jugados">
                PJ
              </th>
              <th scope="col" title="Ganados">
                PG
              </th>
              <th scope="col" title="Empatados">
                PE
              </th>
              <th scope="col" title="Perdidos">
                PP
              </th>
              <th scope="col" title="A favor">
                AF
              </th>
              <th scope="col" title="En contra">
                EC
              </th>
              <th scope="col" title="Diferencia">
                Dif
              </th>
              <th scope="col">Pts</th>
              <th scope="col">Puesto</th>
            </tr>
          </thead>
          <tbody>
            {grupo.tabla.map((f) => (
              <tr key={f.inscripcionId} className={f.clasifica ? 'grupos-clasifica' : undefined}>
                <td>{f.posicion}</td>
                <td>
                  {f.nombre}
                  {f.clasifica && <span className="grupos-pasa"> · pasa</span>}
                </td>
                <td>{f.jugados}</td>
                <td>{f.ganados}</td>
                <td>{f.empatados}</td>
                <td>{f.perdidos}</td>
                <td>{f.aFavor}</td>
                <td>{f.enContra}</td>
                <td>{f.diferencia}</td>
                <td>
                  <strong>{f.puntos}</strong>
                </td>
                <td className="grupos-criterio">{CRITERIO_UI[f.criterio]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grupo.desempatesPendientes.length > 0 && grupo.desempate.length === 0 && (
        <div className="alerta alerta-aviso" role="status">
          Hay un empate que define quién pasa: se juega un partido de desempate.
        </div>
      )}

      {fechas.map((fecha) => (
        <div key={fecha} className="grupos-fecha">
          <h4>Fecha {fecha}</h4>
          <Partidos
            partidos={grupo.partidos.filter((p) => p.ronda === fecha)}
            conEnlaces={conEnlaces}
            pie={pie}
          />
        </div>
      ))}

      {grupo.desempate.length > 0 && (
        <div className="grupos-fecha">
          <h4>Desempate</h4>
          <Partidos partidos={grupo.desempate} conEnlaces={conEnlaces} pie={pie} />
        </div>
      )}
    </section>
  );
};

const Partidos: React.FC<{
  partidos: PartidoBracket[];
  conEnlaces: boolean;
  pie?: (partido: PartidoBracket) => React.ReactNode;
}> = ({ partidos, conEnlaces, pie }) => (
  <div className="grupos-partidos">
    {partidos.map((p) => (
      <div key={p.id} className="grupos-partido">
        {conEnlaces && !p.bye ? (
          <Link to={`/partidos/${p.id}`} className="bracket-partido bracket-partido-enlace">
            <Partido partido={p} />
          </Link>
        ) : (
          <div className="bracket-partido">
            <Partido partido={p} />
          </div>
        )}
        {pie?.(p)}
      </div>
    ))}
  </div>
);
