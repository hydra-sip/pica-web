import React, { useState } from 'react';
import { TorneoVerificacionData } from '../../api/verificacionApi';
import {
  IconoAlerta,
  IconoCheck,
  IconoCopiar,
  IconoCruz,
  IconoDocumento,
  IconoEscudoCheck,
  IconoHash,
  IconoRefrescar,
  IconoSimulacion,
  IconoTrofeo,
} from '../../shared/ui/Iconos';
import {
  InscriptoEntrada,
  recalcularSorteoBracket,
  RecalculoTorneoResultado,
} from '../crypto/recalcularSorteo';

interface Props {
  datos: TorneoVerificacionData;
  nombre: string;
  disciplina: string | null;
}

/** El bracket no tiene compromiso ni firma: lo que lo sella es el hash de la nómina, cerrado antes del sorteo. */
export const VerificacionTorneo: React.FC<Props> = ({ datos, nombre, disciplina }) => {
  // Datos editables para simulación
  const [semillaActual, setSemillaActual] = useState(datos.semilla);
  const [inscriptosActuales, setInscriptosActuales] = useState<InscriptoEntrada[]>(datos.inscriptos);
  const [modoSimulacion, setModoSimulacion] = useState(false);

  // Estado del recálculo
  const [resultadoRecalculo, setResultadoRecalculo] = useState<RecalculoTorneoResultado | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorRecalculo, setErrorRecalculo] = useState<string | null>(null);

  // Feedback copiado
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
      const res = await recalcularSorteoBracket(semillaActual, inscriptosActuales);
      setResultadoRecalculo(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al recalcular el sorteo';
      setErrorRecalculo(msg);
      setResultadoRecalculo(null);
    } finally {
      setCalculando(false);
    }
  };

  // Comparar cruces oficiales vs recalculados
  const crucesOficiales = datos.resultadoOficial.cruces;
  const crucesRecalculados = resultadoRecalculo?.cruces || [];

  const todosCoinciden =
    resultadoRecalculo !== null &&
    crucesOficiales.length === crucesRecalculados.length &&
    crucesOficiales.every((oficial) => {
      const rec = crucesRecalculados.find((c) => c.posicion === oficial.posicion);
      if (!rec) return false;
      return (
        rec.localId === oficial.localId &&
        rec.visitanteId === oficial.visitanteId &&
        rec.bye === oficial.bye
      );
    });

  const hayDiscrepancia = resultadoRecalculo !== null && !todosCoinciden;

  // Acciones de simulación
  const alterarSemilla = () => {
    // Altera el último caracter de la semilla
    const ultimaLetra = semillaActual.slice(-1);
    const nuevaLetra = ultimaLetra === '0' ? 'f' : '0';
    const nuevaSemilla = semillaActual.slice(0, -1) + nuevaLetra;
    setSemillaActual(nuevaSemilla);
    setModoSimulacion(true);
  };

  const alterarInscripto = () => {
    if (inscriptosActuales.length === 0) return;
    const copia = [...inscriptosActuales];
    copia[0] = { ...copia[0], id: copia[0].id + 999, nombre: copia[0].nombre + ' (Alterado)' };
    setInscriptosActuales(copia);
    setModoSimulacion(true);
  };

  const restablecerDatos = () => {
    setSemillaActual(datos.semilla);
    setInscriptosActuales(datos.inscriptos);
    setModoSimulacion(false);
    setResultadoRecalculo(null);
    setErrorRecalculo(null);
  };

  return (
    <div className="verificacion-card">
      <div className="verificacion-card-header">
        <div>
          <h2 className="verificacion-card-titulo">
            <IconoTrofeo size={22} />
            <span>{nombre}</span>
          </h2>
          <div className="verificacion-card-subtitulo">
            {disciplina && (
              <>
                Disciplina: <strong>{disciplina}</strong> |{' '}
              </>
            )}
            Participantes:{' '}
            <strong>{datos.inscriptos.length}</strong> | Rondas:{' '}
            <strong>{datos.resultadoOficial.rondas}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className={`verificacion-btn-secundario ${modoSimulacion ? 'activo' : ''}`}
            onClick={() => setModoSimulacion(!modoSimulacion)}
            data-testid="toggle-simulacion-btn"
          >
            <IconoSimulacion size={16} />
            <span>{modoSimulacion ? 'Ocultar Simulación' : 'Simular Alteración'}</span>
          </button>
        </div>
      </div>

      {/* Panel de Simulación / Auditoría */}
      {modoSimulacion && (
        <div className="verificacion-simulacion-panel activo" data-testid="panel-simulacion">
          <div className="verificacion-simulacion-header">
            <h4 className="verificacion-simulacion-titulo">
              <IconoSimulacion size={18} />
              <span>Modo Simulación de Manipulación (Auditoría de Integridad)</span>
            </h4>
            <div className="verificacion-simulacion-acciones">
              <button
                type="button"
                className="verificacion-btn-alterar"
                onClick={alterarSemilla}
                data-testid="btn-alterar-semilla"
              >
                Alterar semilla
              </button>
              <button
                type="button"
                className="verificacion-btn-alterar"
                onClick={alterarInscripto}
                data-testid="btn-alterar-inscripto"
              >
                Alterar inscripto
              </button>
              <button
                type="button"
                className="verificacion-btn-secundario"
                onClick={restablecerDatos}
                data-testid="btn-restablecer"
              >
                <IconoRefrescar size={14} />
                <span>Restablecer oficiales</span>
              </button>
            </div>
          </div>
          <p className="verificacion-simulacion-nota">
            Modifica la semilla o altera un participante para comprobar cómo el algoritmo SHA-256
            produce un cuadro completamente diferente, evidenciando matemáticamente cualquier intento
            de manipulación de datos.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <div>
              <label className="verificacion-label" htmlFor="input-semilla-simulada">
                Semilla utilizada en la recalculación (editable)
              </label>
              <input
                id="input-semilla-simulada"
                data-testid="input-semilla"
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
        {/* Semilla utilizada */}
        <div className="verificacion-campo-card">
          <div className="verificacion-campo-header">
            <span className="verificacion-campo-label">
              <IconoHash size={14} />
              Semilla Utilizada
            </span>
            <span className="verificacion-campo-badge">32 BYTES HEX</span>
          </div>
          <div className="verificacion-mono-box">
            <span data-testid="semilla-valor">{semillaActual}</span>
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
            Entropía aleatoria que alimenta la función de ordenamiento determinístico.
          </p>
        </div>

        {/* Hash de la lista de inscriptos */}
        <div className="verificacion-campo-card">
          <div className="verificacion-campo-header">
            <span className="verificacion-campo-label">
              <IconoDocumento size={14} />
              Hash de Lista Sellada
            </span>
            <span className="verificacion-campo-badge">SHA-256</span>
          </div>
          <div className="verificacion-mono-box">
            <span data-testid="lista-hash">{datos.listaHash ?? 'Sin sellar'}</span>
            {datos.listaHash && (
              <button
                type="button"
                className="verificacion-btn-copiar"
                onClick={() => copiarAlPortapapeles(datos.listaHash!, 'lista')}
                title="Copiar hash de lista"
              >
                <IconoCopiar size={14} />
              </button>
            )}
          </div>
          {copiadoCampo === 'lista' && (
            <span className="verificacion-copiado-aviso">Copiado al portapapeles</span>
          )}
          <p className="verificacion-campo-explicacion">
            Integridad sellada de la nómina completa de inscripciones al momento del cierre.
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
          data-testid="btn-recalcular"
        >
          <IconoRefrescar size={18} className={calculando ? 'animar-rotacion' : ''} />
          <span>{calculando ? 'Recalculando en navegador...' : 'Recalcular y Verificar'}</span>
        </button>
      </div>

      {/* Banner de resultado */}
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
          data-testid="banner-verificacion-exitosa"
        >
          <div className="verificacion-banner-icono">
            <IconoEscudoCheck size={26} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">
              <span>Resultado 100% Verificado Criptográficamente</span>
            </h4>
            <p className="verificacion-banner-desc">
              La recalculación determinística ejecutada de forma local e independiente en tu navegador
              coincide exactamente con el resultado oficial publicado por la plataforma. Se comprueba
              matemáticamente que el sorteo no fue manipulado.
            </p>
          </div>
        </div>
      )}

      {resultadoRecalculo && hayDiscrepancia && (
        <div
          className="verificacion-banner-status discrepancia"
          data-testid="banner-discrepancia-detectada"
        >
          <div className="verificacion-banner-icono">
            <IconoAlerta size={26} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">
              <span>Discrepancia Detectada (Manipulación Evidenciada)</span>
            </h4>
            <p className="verificacion-banner-desc">
              El resultado recalculado en tu navegador <strong>difiere</strong> del publicado oficialmente
              por la plataforma. Esto comprueba que cualquier alteración en la semilla o en los
              participantes cambia completamente el cuadro final por el efecto avalancha de SHA-256.
            </p>
          </div>
        </div>
      )}

      {/* Tabla comparativa de cruces */}
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
        <span>Resultado Obtenido: Cruces de Primera Ronda</span>
      </h3>

      <div className="verificacion-tabla-wrapper">
        <table className="verificacion-tabla" data-testid="tabla-cruces">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Resultado Publicado (Oficial)</th>
              {resultadoRecalculo && <th>Recalculado en Navegador</th>}
              {resultadoRecalculo && <th>Estado</th>}
            </tr>
          </thead>
          <tbody>
            {crucesOficiales.map((cruceOficial) => {
              const rec = crucesRecalculados.find((c) => c.posicion === cruceOficial.posicion);
              const coincide =
                rec &&
                rec.localId === cruceOficial.localId &&
                rec.visitanteId === cruceOficial.visitanteId &&
                rec.bye === cruceOficial.bye;

              return (
                <tr
                  key={cruceOficial.posicion}
                  className={resultadoRecalculo ? (coincide ? 'match' : 'mismatch') : ''}
                  data-testid={`fila-cruce-${cruceOficial.posicion}`}
                >
                  <td>
                    <strong>Partido {cruceOficial.posicion}</strong>
                  </td>
                  <td>
                    {cruceOficial.bye ? (
                      <div>
                        <span>{cruceOficial.localNombre}</span>{' '}
                        <span className="verificacion-bye-badge">Pasa por BYE</span>
                      </div>
                    ) : (
                      <div>
                        <span>{cruceOficial.localNombre}</span>{' '}
                        <span style={{ color: 'var(--text-muted)' }}>vs</span>{' '}
                        <span>{cruceOficial.visitanteNombre}</span>
                      </div>
                    )}
                  </td>

                  {resultadoRecalculo && (
                    <td>
                      {rec ? (
                        rec.bye ? (
                          <div>
                            <span>{rec.localNombre}</span>{' '}
                            <span className="verificacion-bye-badge">Pasa por BYE</span>
                          </div>
                        ) : (
                          <div>
                            <span>{rec.localNombre}</span>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>vs</span>{' '}
                            <span>{rec.visitanteNombre}</span>
                          </div>
                        )
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

      {/* Tabla detallada de ordenamiento determinístico */}
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
            Ver ordenamiento determinístico y hashes individuales ({resultadoRecalculo.orden.length}{' '}
            inscriptos)
          </summary>
          <div className="verificacion-tabla-wrapper">
            <table className="verificacion-tabla">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>ID</th>
                  <th>Participante</th>
                  <th>SHA-256(Semilla + ":" + ID)</th>
                </tr>
              </thead>
              <tbody>
                {resultadoRecalculo.orden.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>#{item.posicionOrden}</strong>
                    </td>
                    <td>{item.id}</td>
                    <td>{item.nombre}</td>
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
