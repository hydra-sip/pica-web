import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PerfilOrganizador, perfilOrganizadorApi } from '../../api/perfilOrganizadorApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Table } from '../../shared/ui';
import { TorneoCard } from '../../torneos/components/TorneoCard';
import { rangoFairPlay } from '../components/IndiceFairPlay';
import '../reputacion.css';

const conSigno = (delta: number): string =>
  delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : '0';

/**
 * HU-806 (T806-2): Perfil público de un organizador (/organizadores/:id). Muestra su identidad visible, contadores de
 * torneos organizados, finalizados y cancelados, índice del organizador con su historial y sus torneos próximos.
 */
export const PerfilOrganizadorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const organizadorId = Number(id);

  const [perfil, setPerfil] = useState<PerfilOrganizador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    let vigente = true;
    if (!id || !Number.isFinite(organizadorId) || organizadorId <= 0) {
      setError('Identificador de organizador inválido.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);
    perfilOrganizadorApi
      .ver(organizadorId)
      .then((datos) => {
        if (vigente) {
          setPerfil(datos);
          setCargando(false);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(mensajeDeError(err, 'No se pudo cargar el perfil del organizador.'));
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [id, organizadorId]);

  const inicial = (perfil?.nombreCompleto || perfil?.username || 'O').charAt(0).toUpperCase();
  const rango = perfil ? rangoFairPlay(perfil.indice) : 'alto';

  return (
    <div className="organizador-perfil-contenedor">
      <div className="organizador-breadcrumb">
        <Link to="/torneos" className="organizador-volver-link">
          ← Volver al catálogo de torneos
        </Link>
      </div>

      {cargando ? (
        <section className="pica-card hydra-card reputacion-tarjeta" aria-live="polite">
          <p className="reputacion-ayuda" role="status">
            Cargando perfil del organizador...
          </p>
        </section>
      ) : error || !perfil ? (
        <div className="alerta alerta-peligro" role="alert">
          {error || 'No se encontró el perfil del organizador.'}
        </div>
      ) : (
        <>
          {/* Cabecera e índice del organizador */}
          <section className="pica-card hydra-card reputacion-tarjeta organizador-cabecera">
            <div className="organizador-identidad">
              <div className="organizador-avatar" aria-hidden="true">
                {perfil.avatar ? (
                  <img src={perfil.avatar} alt="" className="organizador-avatar-img" />
                ) : (
                  inicial
                )}
              </div>
              <div>
                <span className="organizador-rol-tag">Organizador</span>
                <h1 className="organizador-nombre">{perfil.nombreCompleto || perfil.username}</h1>
                <p className="organizador-username">@{perfil.username}</p>
              </div>
            </div>

            <div className="organizador-indice-bloque">
              <span className="organizador-indice-etiqueta">Índice del organizador</span>
              <div className="organizador-indice-valor-fila">
                <span
                  className={`indice-valor indice-${rango} organizador-indice-numero`}
                  aria-label={`Índice del organizador ${perfil.indice}, ${rango}`}
                >
                  {perfil.indice}
                </span>
              </div>
              <p className="reputacion-ayuda">
                Arranca en 100 y baja con cada cancelación de torneo, más si tuvo gastos. Nunca baja
                de 0.
              </p>
            </div>
          </section>

          {/* Contadores del historial */}
          <section
            className="organizador-contadores"
            aria-label="Historial de torneos del organizador"
          >
            <article className="pica-card hydra-card organizador-contador-card">
              <span className="organizador-contador-label">Torneos organizados</span>
              <strong className="organizador-contador-valor">{perfil.torneosOrganizados}</strong>
            </article>
            <article className="pica-card hydra-card organizador-contador-card">
              <span className="organizador-contador-label">Torneos finalizados</span>
              <strong className="organizador-contador-valor">{perfil.torneosFinalizados}</strong>
            </article>
            <article className="pica-card hydra-card organizador-contador-card">
              <span className="organizador-contador-label">Torneos cancelados</span>
              <strong className="organizador-contador-valor">{perfil.torneosCancelados}</strong>
            </article>
          </section>

          {/* Historial de movimientos del índice (cuando hubo cancelaciones) */}
          {perfil.historialIndice.length > 0 && (
            <section
              className="pica-card hydra-card reputacion-tarjeta"
              aria-labelledby="organizador-historial-indice"
            >
              <h2 id="organizador-historial-indice">Movimientos del índice</h2>
              <Table caption="Historial del índice del organizador">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Torneo</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Cambio</th>
                    <th scope="col">Quedó en</th>
                  </tr>
                </thead>
                <tbody>
                  {perfil.historialIndice.map((m) => (
                    <tr key={`${m.torneoId}-${m.creadoEn}`}>
                      <td>{fechaHora(m.creadoEn)}</td>
                      <td>{m.torneo}</td>
                      <td>{m.conGastos ? 'Cancelación con gastos' : 'Cancelación sin gastos'}</td>
                      <td className={m.delta < 0 ? 'reputacion-baja' : undefined}>
                        {conSigno(m.delta)}
                      </td>
                      <td>{m.valorResultante}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </section>
          )}

          {/* Torneos próximos del organizador */}
          <section
            className="pica-card hydra-card reputacion-tarjeta"
            aria-labelledby="organizador-torneos-proximos"
          >
            <h2 id="organizador-torneos-proximos">Torneos próximos</h2>
            {perfil.torneosProximos.length === 0 ? (
              <p className="reputacion-ayuda">
                No tiene torneos próximos publicados en este momento.
              </p>
            ) : (
              <div className="organizador-torneos-grid">
                {perfil.torneosProximos.map((torneo) => (
                  <TorneoCard key={torneo.id} torneo={torneo} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
