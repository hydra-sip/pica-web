import React, { useState } from 'react';
import { RifaVerificacionData } from '../../api/verificacionApi';
import {
  IconoAlerta,
  IconoCandado,
  IconoCheck,
  IconoCopiar,
  IconoCruz,
  IconoDocumento,
  IconoEscudoCheck,
  IconoHash,
  IconoRefrescar,
  IconoRifas,
  IconoSimulacion,
} from '../../shared/ui/Iconos';
import { recalcularSorteoRifa, RecalculoRifaResultado } from '../crypto/recalcularSorteo';

interface Props {
  datos: RifaVerificacionData;
}

export const VerificacionRifa: React.FC<Props> = ({ datos }) => {
  // Datos editables para simulación
  const [semillaActual, setSemillaActual] = useState(datos.semilla);
  const [listaActual, setListaActual] = useState(datos.lista);
  const [modoSimulacion, setModoSimulacion] = useState(false);

  // Estado del recálculo
  const [resultadoRecalculo, setResultadoRecalculo] = useState<RecalculoRifaResultado | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorRecalculo, setErrorRecalculo] = useState<string | null>(null);

  // Feedback de copiado
  const [copiadoCampo, setCopiadoCampo] = useState<string | null>(null);

  const copiarAlPortapapeles = (texto: string, campo: string) => {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiadoCampo(campo);
      setTimeout(() => setCopiadoCampo(null), 2000);
    });
  };

  const ejecutarRecalculacion = async () => {
    setCalculando(true);
    setErrorRecalculo(null);
    try {
      const res = await recalcularSorteoRifa(
        semillaActual,
        listaActual,
        datos.fechaSorteo,
        datos.premios
      );
      setResultadoRecalculo(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al recalcular el sorteo';
      setErrorRecalculo(msg);
      setResultadoRecalculo(null);
    } finally {
      setCalculando(false);
    }
  };

  const ganadoresOficiales = [...datos.premios].sort((a, b) => a.puesto - b.puesto);
  const ganadoresRecalculados = resultadoRecalculo?.ganadores || [];

  // la lista se recalcula del desglose y el compromiso, de esa lista y la fecha del sorteo
  const listaCoincide = resultadoRecalculo?.listaHashCalculado === datos.listaHash;
  const compromisoCoincide = resultadoRecalculo?.compromisoCalculado === datos.compromisoHash;

  const todosCoinciden =
    resultadoRecalculo !== null &&
    listaCoincide &&
    compromisoCoincide &&
    ganadoresOficiales.length === ganadoresRecalculados.length &&
    ganadoresOficiales.every((oficial) => {
      const rec = ganadoresRecalculados.find((g) => g.puesto === oficial.puesto);
      if (!rec) return false;
      return rec.numeroGanador === oficial.numeroGanador;
    });

  const hayDiscrepancia = resultadoRecalculo !== null && !todosCoinciden;

  // Acciones de simulación
  const alterarSemilla = () => {
    const alterada = semillaActual.endsWith('!') ? semillaActual.slice(0, -1) : semillaActual + '!';
    setSemillaActual(alterada);
    setModoSimulacion(true);
  };

  const alterarNumeros = () => {
    if (listaActual.length === 0) return;
    const copia = [...listaActual];
    copia[0] = { ...copia[0], numero: copia[0].numero + 9999 };
    setListaActual(copia);
    setModoSimulacion(true);
  };

  const restablecerDatos = () => {
    setSemillaActual(datos.semilla);
    setListaActual(datos.lista);
    setModoSimulacion(false);
    setResultadoRecalculo(null);
    setErrorRecalculo(null);
  };

  return (
    <div className="verificacion-card">
      <div className="verificacion-card-header">
        <div>
          <h2 className="verificacion-card-titulo">
            <IconoRifas size={22} />
            <span>{datos.titulo}</span>
          </h2>
          <div className="verificacion-card-subtitulo">
            {datos.torneoNombre && (
              <>
                Torneo Asociado: <strong>{datos.torneoNombre}</strong> |{' '}
              </>
            )}
            Números Vendidos: <strong>{datos.lista.length}</strong> | Premios:{' '}
            <strong>{datos.premios.length}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className={`verificacion-btn-secundario ${modoSimulacion ? 'activo' : ''}`}
            onClick={() => setModoSimulacion(!modoSimulacion)}
            data-testid="toggle-simulacion-rifa-btn"
          >
            <IconoSimulacion size={16} />
            <span>{modoSimulacion ? 'Ocultar Simulación' : 'Simular Alteración'}</span>
          </button>
        </div>
      </div>

      {/* Panel de Simulación */}
      {modoSimulacion && (
        <div className="verificacion-simulacion-panel activo" data-testid="panel-simulacion-rifa">
          <div className="verificacion-simulacion-header">
            <h4 className="verificacion-simulacion-titulo">
              <IconoSimulacion size={18} />
              <span>Modo Simulación de Manipulación (Auditoría de Rifa)</span>
            </h4>
            <div className="verificacion-simulacion-acciones">
              <button
                type="button"
                className="verificacion-btn-alterar"
                onClick={alterarSemilla}
                data-testid="btn-alterar-semilla-rifa"
              >
                Alterar semilla
              </button>
              <button
                type="button"
                className="verificacion-btn-alterar"
                onClick={alterarNumeros}
                data-testid="btn-alterar-numeros-rifa"
              >
                Alterar números vendidos
              </button>
              <button
                type="button"
                className="verificacion-btn-secundario"
                onClick={restablecerDatos}
                data-testid="btn-restablecer-rifa"
              >
                <IconoRefrescar size={14} />
                <span>Restablecer oficiales</span>
              </button>
            </div>
          </div>
          <p className="verificacion-simulacion-nota">
            Modifica la semilla o altera la lista de números vendidos para comprobar que el hash de
            la lista, el compromiso o los números ganadores difieren inmediatamente, evidenciando
            manipulación.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <div>
              <label className="verificacion-label" htmlFor="input-semilla-rifa">
                Semilla utilizada en la recalculación (editable)
              </label>
              <input
                id="input-semilla-rifa"
                data-testid="input-semilla-rifa"
                type="text"
                className="verificacion-input"
                value={semillaActual}
                onChange={(e) => setSemillaActual(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Criptografía del sorteo */}
      <div className="verificacion-crypto-grid">
        {/* Hash de compromiso previo */}
        <div className="verificacion-campo-card">
          <div className="verificacion-campo-header">
            <span className="verificacion-campo-label">
              <IconoCandado size={14} />
              Hash de Compromiso Publicado
            </span>
            <span className="verificacion-campo-badge">SHA-256</span>
          </div>
          <div className="verificacion-mono-box">
            <span data-testid="compromiso-hash-rifa">{datos.compromisoHash}</span>
            <button
              type="button"
              className="verificacion-btn-copiar"
              onClick={() => copiarAlPortapapeles(datos.compromisoHash, 'compromiso')}
              title="Copiar hash de compromiso"
            >
              <IconoCopiar size={14} />
            </button>
          </div>
          {copiadoCampo === 'compromiso' && (
            <span className="verificacion-copiado-aviso">Copiado al portapapeles</span>
          )}
          <p className="verificacion-campo-explicacion">
            Publicado al cerrar la venta, antes de la semilla: SHA-256(hash de la lista +
            &quot;:&quot; + fecha del sorteo). Fecha del sorteo: <code>{datos.fechaSorteo}</code>.
          </p>
        </div>

        {/* Semilla externa */}
        <div className="verificacion-campo-card">
          <div className="verificacion-campo-header">
            <span className="verificacion-campo-label">
              <IconoHash size={14} />
              Semilla del Sorteo
            </span>
            <span className="verificacion-campo-badge">HEX</span>
          </div>
          <div className="verificacion-mono-box">
            <span data-testid="semilla-valor-rifa">{semillaActual}</span>
            <button
              type="button"
              className="verificacion-btn-copiar"
              onClick={() => copiarAlPortapapeles(semillaActual, 'semilla')}
              title="Copiar semilla"
            >
              <IconoCopiar size={14} />
            </button>
          </div>
          {copiadoCampo === 'semilla' && (
            <span className="verificacion-copiado-aviso">Copiada al portapapeles</span>
          )}
          <p className="verificacion-campo-explicacion">
            Generada por la plataforma al sortear, después de publicado el compromiso.
          </p>
        </div>

        {/* Firma digital de la semilla: solo con semilla externa (PICA-299) */}
        {datos.semillaFirma && (
          <div className="verificacion-campo-card">
            <div className="verificacion-campo-header">
              <span className="verificacion-campo-label">
                <IconoEscudoCheck size={14} />
                Firma Digital de la Semilla
              </span>
              <span className="verificacion-campo-badge">Ed25519 / RSA</span>
            </div>
            <div className="verificacion-mono-box">
              <span data-testid="semilla-firma-rifa">{datos.semillaFirma}</span>
              <button
                type="button"
                className="verificacion-btn-copiar"
                onClick={() => copiarAlPortapapeles(datos.semillaFirma!, 'firma')}
                title="Copiar firma"
              >
                <IconoCopiar size={14} />
              </button>
            </div>
            {copiadoCampo === 'firma' && (
              <span className="verificacion-copiado-aviso">Copiada al portapapeles</span>
            )}
            <p className="verificacion-campo-explicacion">
              Certificación criptográfica de autenticidad e inalterabilidad de la semilla externa.
            </p>
          </div>
        )}

        {/* Hash de lista de números vendidos */}
        <div className="verificacion-campo-card">
          <div className="verificacion-campo-header">
            <span className="verificacion-campo-label">
              <IconoDocumento size={14} />
              Hash de la Lista Sellada
            </span>
            <span className="verificacion-campo-badge">SHA-256</span>
          </div>
          <div className="verificacion-mono-box">
            <span data-testid="lista-hash-rifa">{datos.listaHash}</span>
            <button
              type="button"
              className="verificacion-btn-copiar"
              onClick={() => copiarAlPortapapeles(datos.listaHash, 'lista')}
              title="Copiar hash de lista"
            >
              <IconoCopiar size={14} />
            </button>
          </div>
          {copiadoCampo === 'lista' && (
            <span className="verificacion-copiado-aviso">Copiado al portapapeles</span>
          )}
          <p className="verificacion-campo-explicacion">
            SHA-256 de una línea &quot;número;ticket&quot; por cada número vendido, de menor a
            mayor, fijado al cerrar la venta.
          </p>
        </div>
      </div>

      {/* Botón de recálculo */}
      <div className="verificacion-acciones-principales">
        <button
          type="button"
          className="verificacion-btn-recalcular"
          onClick={ejecutarRecalculacion}
          disabled={calculando}
          data-testid="btn-recalcular-rifa"
        >
          <IconoRefrescar size={18} className={calculando ? 'animar-rotacion' : ''} />
          <span>{calculando ? 'Recalculando en navegador...' : 'Recalcular y Verificar'}</span>
        </button>
      </div>

      {/* Banners de verificación */}
      {errorRecalculo && (
        <div className="verificacion-banner-status discrepancia">
          <div className="verificacion-banner-icono">
            <IconoAlerta size={24} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">Error al recalcular</h4>
            <p className="verificacion-banner-desc">{errorRecalculo}</p>
          </div>
        </div>
      )}

      {resultadoRecalculo && todosCoinciden && (
        <div
          className="verificacion-banner-status verificado"
          data-testid="banner-verificacion-exitosa-rifa"
        >
          <div className="verificacion-banner-icono">
            <IconoEscudoCheck size={26} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">
              <span>Rifa 100% Verificada Criptográficamente</span>
            </h4>
            <p className="verificacion-banner-desc">
              La lista sellada, el compromiso y los números ganadores recalculados en tu navegador
              coinciden plenamente con los publicados por la plataforma.
            </p>
          </div>
        </div>
      )}

      {resultadoRecalculo && hayDiscrepancia && (
        <div
          className="verificacion-banner-status discrepancia"
          data-testid="banner-discrepancia-detectada-rifa"
        >
          <div className="verificacion-banner-icono">
            <IconoAlerta size={26} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">
              <span>Discrepancia Detectada (Manipulación Evidenciada)</span>
            </h4>
            <p className="verificacion-banner-desc">
              {!listaCoincide ? (
                <>
                  El hash de la lista recalculada (
                  <code>{resultadoRecalculo.listaHashCalculado.slice(0, 16)}...</code>) no coincide
                  con el publicado. La lista de números vendidos fue modificada.
                </>
              ) : !compromisoCoincide ? (
                <>El compromiso recalculado no coincide con el publicado antes del sorteo.</>
              ) : (
                <>
                  Los números ganadores recalculados difieren de los publicados por la plataforma.
                  Cualquier variación en los datos altera completamente el orden final.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Tabla comparativa de premios y ganadores */}
      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          margin: '1.5rem 0 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span>Resultado Obtenido: Números Ganadores por Premio</span>
      </h3>

      <div className="verificacion-tabla-wrapper">
        <table className="verificacion-tabla" data-testid="tabla-ganadores-rifa">
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Premio</th>
              <th>Nº Ganador</th>
              <th>Ganador</th>
              {resultadoRecalculo && <th>Ganador Recalculado</th>}
              {resultadoRecalculo && <th>Estado</th>}
            </tr>
          </thead>
          <tbody>
            {ganadoresOficiales.map((oficial) => {
              const rec = ganadoresRecalculados.find((g) => g.puesto === oficial.puesto);
              const coincide = rec && rec.numeroGanador === oficial.numeroGanador;

              return (
                <tr
                  key={oficial.puesto}
                  className={resultadoRecalculo ? (coincide ? 'match' : 'mismatch') : ''}
                  data-testid={`fila-premio-${oficial.puesto}`}
                >
                  <td>
                    <strong>#{oficial.puesto}</strong>
                  </td>
                  <td>
                    <div>
                      <span>{oficial.descripcion}</span>{' '}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ({oficial.pct}%)
                      </span>
                    </div>
                  </td>
                  <td>
                    {oficial.numeroGanador !== null ? (
                      <strong>Número {oficial.numeroGanador}</strong>
                    ) : (
                      <span>Sin ganador</span>
                    )}
                  </td>
                  <td>{oficial.ganador ?? '-'}</td>

                  {resultadoRecalculo && (
                    <td>
                      {rec && rec.numeroGanador !== null ? (
                        <strong>Número {rec.numeroGanador}</strong>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  )}

                  {resultadoRecalculo && (
                    <td>
                      {coincide ? (
                        <span className="verificacion-badge-coincide">
                          <IconoCheck size={13} />
                          Coincide
                        </span>
                      ) : (
                        <span className="verificacion-badge-difiere">
                          <IconoCruz size={13} />
                          Difiere
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalle de números y hashes individuales */}
      {resultadoRecalculo && (
        <details style={{ marginTop: '1.5rem' }}>
          <summary
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--color-primario, #2563eb)',
              padding: '0.5rem 0',
            }}
          >
            Ver hashes individuales de los {resultadoRecalculo.orden.length} números vendidos
          </summary>
          <div className="verificacion-tabla-wrapper">
            <table className="verificacion-tabla">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Número de Boleto</th>
                  <th>SHA-256(Semilla + ":" + Número)</th>
                </tr>
              </thead>
              <tbody>
                {resultadoRecalculo.orden.map((item) => (
                  <tr key={item.numero}>
                    <td>
                      <strong>#{item.posicionOrden}</strong>
                    </td>
                    <td>
                      <strong>Boleto {item.numero}</strong>
                    </td>
                    <td className="verificacion-hash-celda" title={item.hash}>
                      {item.hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
};
