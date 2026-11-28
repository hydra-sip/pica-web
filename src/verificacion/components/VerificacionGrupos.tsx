import React, { useEffect, useState } from 'react';
import { SorteoGrupos } from '../../api/torneoApi';
import { abreviarHash } from '../../torneos/formato';
import {
  compromisoCoincide,
  recalcularSorteoGrupos,
  RecalculoGrupos,
} from '../crypto/recalcularGrupos';
import { ConsultaDrand, consultarDrand, semillaEsDeLaFirma } from '../crypto/semillaDrand';

interface Comprobacion {
  compromiso: boolean;
  firma: boolean;
  recalculo: RecalculoGrupos;
  /** Por letra, si el grupo recalculado es el publicado. */
  grupos: Record<string, boolean>;
}

/**
 * La verificación del sorteo de los grupos (CR-02-9), en el navegador: el compromiso publicado al cerrar la
 * inscripción, que la semilla sea la de la firma de drand, y el reparto recalculado contra el publicado. Se puede
 * además consultar la ronda directo en drand.
 */
export const VerificacionGrupos: React.FC<{ datos: SorteoGrupos }> = ({ datos }) => {
  const [comprobacion, setComprobacion] = useState<Comprobacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drand, setDrand] = useState<ConsultaDrand | 'consultando' | null>(null);

  useEffect(() => {
    let vigente = true;
    const { semilla, semillaFirma, semillaRonda, compromisoHash } = datos;
    if (!semilla || !semillaFirma || semillaRonda === null || !compromisoHash) return undefined;
    Promise.all([
      compromisoCoincide(datos.listaHash, semillaRonda, compromisoHash),
      semillaEsDeLaFirma(semilla, semillaFirma),
      recalcularSorteoGrupos(semilla, datos.inscripciones, datos.cantidadGrupos),
    ])
      .then(([compromiso, firma, recalculo]) => {
        if (!vigente) return;
        const grupos = Object.fromEntries(
          datos.grupos.map((g, i) => [
            g.letra,
            JSON.stringify(g.integrantes.map((x) => x.inscripcionId)) ===
              JSON.stringify(recalculo.grupos[i] ?? []),
          ])
        );
        setComprobacion({ compromiso, firma, recalculo, grupos });
      })
      .catch(() => vigente && setError('No se pudo recalcular el sorteo en el navegador.'));
    return () => {
      vigente = false;
    };
  }, [datos]);

  if (!datos.semilla) {
    return (
      <div className="verificacion-card">
        <h3 className="verificacion-card-titulo">{datos.torneoNombre}</h3>
        <p className="verificacion-campo-explicacion">
          Los grupos todavía no se sortearon. El compromiso ya está publicado: la semilla va a ser
          el valor de la ronda {datos.semillaRonda} de drand, que se fijó al cerrar la inscripción.
        </p>
        {datos.compromisoHash && (
          <code className="verificacion-mono-box">{datos.compromisoHash}</code>
        )}
      </div>
    );
  }

  const nombres = new Map(
    datos.grupos.flatMap((g) => g.integrantes.map((x) => [x.inscripcionId, x.nombre] as const))
  );
  const todos =
    comprobacion !== null &&
    comprobacion.compromiso &&
    comprobacion.firma &&
    Object.values(comprobacion.grupos).every(Boolean) &&
    comprobacion.recalculo.grupos.length === datos.grupos.length;

  const consultar = async () => {
    if (!datos.semillaUrl || datos.semillaRonda === null) return;
    setDrand('consultando');
    setDrand(
      await consultarDrand(
        datos.semillaUrl,
        datos.semillaRonda,
        datos.semilla!,
        datos.semillaFirma!
      )
    );
  };

  return (
    <div className="verificacion-card" data-testid="verificacion-grupos">
      <div className="verificacion-card-header">
        <h3 className="verificacion-card-titulo">{datos.torneoNombre}</h3>
        <p className="verificacion-card-subtitulo">
          {datos.cantidadGrupos} grupos · {datos.inscripciones.length} inscripciones · algoritmo v
          {datos.version}
        </p>
      </div>

      {error && (
        <div className="verificacion-banner-status discrepancia" role="alert">
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">Error al recalcular</h4>
            <p className="verificacion-banner-desc">{error}</p>
          </div>
        </div>
      )}

      {comprobacion && (
        <div
          className={`verificacion-banner-status ${todos ? 'verificado' : 'discrepancia'}`}
          data-testid={todos ? 'banner-grupos-coincide' : 'banner-grupos-no-coincide'}
        >
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">{todos ? 'Coincide' : 'No coincide'}</h4>
            <p className="verificacion-banner-desc">
              {todos
                ? 'El compromiso, la semilla de drand y el reparto recalculado en tu navegador coinciden con lo que publicó la plataforma.'
                : 'Lo recalculado en tu navegador no coincide con lo publicado: revisá el detalle de abajo.'}
            </p>
          </div>
        </div>
      )}

      <div className="verificacion-crypto-grid">
        <Campo
          titulo="Lista sellada"
          valor={datos.listaHash}
          explicacion="SHA-256 de los inscriptos confirmados, sellada al cerrar la inscripción."
        />
        <Campo
          titulo={`Compromiso (ronda ${datos.semillaRonda})`}
          valor={datos.compromisoHash ?? ''}
          ok={comprobacion?.compromiso}
          explicacion="SHA-256 de lista:ronda, publicado antes de que la ronda de drand saliera: nadie podía conocer la semilla."
        />
        <Campo
          titulo="Semilla de drand"
          valor={datos.semilla}
          ok={comprobacion?.firma}
          explicacion="El randomness de la ronda: el SHA-256 de su firma, como lo deriva drand."
        />
      </div>

      {datos.semillaUrl && (
        <p className="verificacion-campo-explicacion">
          <button
            type="button"
            className="verificacion-btn-copiar"
            onClick={() => void consultar()}
          >
            Consultar la ronda en drand
          </button>{' '}
          {drand === 'consultando' && 'Consultando…'}
          {drand === 'coincide' && 'drand devuelve la misma semilla y la misma firma.'}
          {drand === 'difiere' &&
            'drand devuelve otra cosa: la semilla publicada no es la de esa ronda.'}
          {drand === 'sin-respuesta' && 'drand no respondió: probá más tarde.'}
        </p>
      )}

      {comprobacion && (
        <div className="verificacion-tabla-wrapper">
          <table className="verificacion-tabla">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Inscripción</th>
                <th>SHA-256(semilla:id)</th>
                <th>Grupo</th>
              </tr>
            </thead>
            <tbody>
              {comprobacion.recalculo.orden.map((o, i) => (
                <tr key={o.id}>
                  <td>{i + 1}</td>
                  <td>{nombres.get(o.id) ?? `#${o.id}`}</td>
                  <td className="verificacion-hash-celda" title={o.hash}>
                    {abreviarHash(o.hash)}
                  </td>
                  <td>{o.letra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comprobacion &&
        datos.grupos.map((g) => (
          <p key={g.letra} className="verificacion-campo-explicacion">
            <strong>Grupo {g.letra}</strong>: {g.integrantes.map((x) => x.nombre).join(', ')} —{' '}
            {comprobacion.grupos[g.letra] ? 'coincide' : 'no coincide'}
          </p>
        ))}
    </div>
  );
};

const Campo: React.FC<{ titulo: string; valor: string; explicacion: string; ok?: boolean }> = ({
  titulo,
  valor,
  explicacion,
  ok,
}) => (
  <div className="verificacion-campo-card">
    <div className="verificacion-campo-header">
      <span className="verificacion-campo-label">{titulo}</span>
      {ok !== undefined && (
        <span className="verificacion-campo-badge">{ok ? 'Coincide' : 'No coincide'}</span>
      )}
    </div>
    <code className="verificacion-mono-box" title={valor}>
      {valor}
    </code>
    <p className="verificacion-campo-explicacion">{explicacion}</p>
  </div>
);
