import React from 'react';
import { FilaRanking } from '../../api/pronosticoApi';
import { IconoPodio } from '../../shared/ui/Iconos';

interface TablaRankingProps {
  ranking: FilaRanking[];
  usuarioActualId?: number | string;
}

export const TablaRanking: React.FC<TablaRankingProps> = ({ ranking, usuarioActualId }) => {
  if (ranking.length === 0) {
    return (
      <div className="pronosticos-vacio">
        <IconoPodio size={40} />
        <h3>Aún no hay puntuaciones registradas</h3>
        <p>Los puntajes se actualizarán a medida que finalicen los partidos pronosticados.</p>
      </div>
    );
  }

  const primerPuesto = ranking.find((r) => r.posicion === 1);
  const segundoPuesto = ranking.find((r) => r.posicion === 2);
  const tercerPuesto = ranking.find((r) => r.posicion === 3);

  const getIniciales = (nombre: string, username: string) => {
    const texto = nombre?.trim() || username?.trim() || '?';
    const partes = texto.split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  };

  return (
    <div className="pronosticos-ranking-seccion">
      {/* Podio Top 3 */}
      {primerPuesto && (
        <div className="pronosticos-podio">
          {segundoPuesto && (
            <div className="podio-columna podio-columna-2">
              <div className="podio-tarjeta">
                <span className="podio-medalla">2°</span>
                <div className="podio-avatar">
                  {getIniciales(segundoPuesto.nombreCompleto, segundoPuesto.username)}
                </div>
                <span className="podio-nombre" title={segundoPuesto.nombreCompleto || segundoPuesto.username}>
                  {segundoPuesto.nombreCompleto || segundoPuesto.username}
                </span>
                <span className="podio-puntos">{segundoPuesto.puntos} pts</span>
                <span className="podio-aciertos">{segundoPuesto.aciertos} aciertos</span>
              </div>
            </div>
          )}

          <div className="podio-columna podio-columna-1">
            <div className="podio-tarjeta">
              <span className="podio-medalla">1°</span>
              <div className="podio-avatar">
                {getIniciales(primerPuesto.nombreCompleto, primerPuesto.username)}
              </div>
              <span className="podio-nombre" title={primerPuesto.nombreCompleto || primerPuesto.username}>
                {primerPuesto.nombreCompleto || primerPuesto.username}
              </span>
              <span className="podio-puntos">{primerPuesto.puntos} pts</span>
              <span className="podio-aciertos">{primerPuesto.aciertos} aciertos</span>
            </div>
          </div>

          {tercerPuesto && (
            <div className="podio-columna podio-columna-3">
              <div className="podio-tarjeta">
                <span className="podio-medalla">3°</span>
                <div className="podio-avatar">
                  {getIniciales(tercerPuesto.nombreCompleto, tercerPuesto.username)}
                </div>
                <span className="podio-nombre" title={tercerPuesto.nombreCompleto || tercerPuesto.username}>
                  {tercerPuesto.nombreCompleto || tercerPuesto.username}
                </span>
                <span className="podio-puntos">{tercerPuesto.puntos} pts</span>
                <span className="podio-aciertos">{tercerPuesto.aciertos} aciertos</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla completa de clasificados */}
      <div className="pronosticos-tabla-card">
        <table className="pronosticos-tabla">
          <thead>
            <tr>
              <th style={{ width: '70px', textAlign: 'center' }}>Pos</th>
              <th>Participante</th>
              <th style={{ textAlign: 'right' }}>Puntos</th>
              <th style={{ textAlign: 'center' }}>Aciertos</th>
              <th style={{ textAlign: 'right' }}>Efectividad</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((fila) => {
              const esYo =
                usuarioActualId != null && String(fila.usuarioId) === String(usuarioActualId);
              const efectividad =
                fila.efectividadPct != null
                  ? fila.efectividadPct
                  : fila.pronosticosTotales > 0
                  ? Math.round((fila.aciertos / fila.pronosticosTotales) * 100)
                  : 0;

              return (
                <tr
                  key={fila.usuarioId}
                  className={esYo ? 'es-usuario-actual' : ''}
                  data-testid={`fila-ranking-${fila.usuarioId}`}
                >
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`pronosticos-posicion-badge ${
                        fila.posicion === 1
                          ? 'pronosticos-posicion-1'
                          : fila.posicion === 2
                          ? 'pronosticos-posicion-2'
                          : fila.posicion === 3
                          ? 'pronosticos-posicion-3'
                          : ''
                      }`}
                    >
                      {fila.posicion}
                    </span>
                  </td>
                  <td>
                    <div className="pronosticos-usuario-celda">
                      <div className="pronosticos-usuario-avatar" aria-hidden="true">
                        {getIniciales(fila.nombreCompleto, fila.username)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{fila.nombreCompleto || fila.username}</span>
                          {esYo && (
                            <span
                              className="badge badge-borde"
                              style={{ fontSize: '10px', padding: '1px 5px' }}
                            >
                              Tú
                            </span>
                          )}
                        </div>
                        <small style={{ color: 'var(--color-text-secondary)' }}>
                          @{fila.username}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="pronosticos-puntos-destacados">{fila.puntos}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span>
                      {fila.aciertos} / {fila.pronosticosTotales}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span>{efectividad}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
