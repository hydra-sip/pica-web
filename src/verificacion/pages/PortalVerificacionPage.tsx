import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SorteoItemResumen,
  TipoSorteo,
  TorneoVerificacionData,
  verificacionApi,
} from '../../api/verificacionApi';
import { mensajeDeError } from '../../shared/mensajesError';
import {
  IconoAlerta,
  IconoBuscar,
  IconoEscudoCheck,
  IconoRefrescar,
  IconoRifas,
  IconoTrofeo,
} from '../../shared/ui/Iconos';
import { VerificacionTorneo } from '../components/VerificacionTorneo';
import '../verificacion.css';

export const PortalVerificacionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tipo seleccionado: TORNEO o RIFA
  const tipoParam = searchParams.get('tipo');
  const tipoInicial: TipoSorteo = tipoParam?.toUpperCase() === 'RIFA' ? 'RIFA' : 'TORNEO';
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSorteo>(tipoInicial);

  // Torneos con el bracket sorteado, del catálogo público
  const [sorteosDisponibles, setSorteosDisponibles] = useState<SorteoItemResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  // ID actual
  const [idConsultado, setIdConsultado] = useState<string>(searchParams.get('id') || '');

  // Datos del sorteo consultado
  const [datosTorneo, setDatosTorneo] = useState<TorneoVerificacionData | null>(null);
  const [cargandoSorteo, setCargandoSorteo] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  // Consultar cambia la URL y la URL vuelve a disparar el efecto: así no se pide dos veces
  const ultimoConsultado = useRef<string | null>(null);

  // Cargar lista disponible
  useEffect(() => {
    let vigente = true;
    setCargandoLista(true);
    verificacionApi
      .listarTorneos()
      .then((items) => {
        if (!vigente) return;
        setSorteosDisponibles(items);
      })
      .catch(() => {
        // sin la lista queda el campo para ingresar el id
        if (!vigente) return;
        setSorteosDisponibles([]);
      })
      .finally(() => {
        if (vigente) setCargandoLista(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const consultarTorneo = useCallback(
    async (id: string | number) => {
      if (!id) return;
      ultimoConsultado.current = String(id);
      setCargandoSorteo(true);
      setErrorConsulta(null);

      // Sincronizar query params
      setSearchParams({ tipo: 'torneo', id: String(id) });

      try {
        setDatosTorneo(await verificacionApi.obtenerTorneo(id));
      } catch (err: unknown) {
        setErrorConsulta(mensajeDeError(err, 'No se pudo cargar el sorteo especificado.'));
        setDatosTorneo(null);
      } finally {
        setCargandoSorteo(false);
      }
    },
    [setSearchParams]
  );

  // Consultar en el montaje si viene un id en searchParams o seleccionar el primero disponible
  useEffect(() => {
    if (searchParams.get('tipo')?.toUpperCase() === 'RIFA') {
      setTipoSeleccionado('RIFA');
      return;
    }
    const idUrl = searchParams.get('id');
    if (idUrl) {
      if (idUrl === ultimoConsultado.current) return;
      setIdConsultado(idUrl);
      setTipoSeleccionado('TORNEO');
      consultarTorneo(idUrl);
    } else if (sorteosDisponibles.length > 0) {
      const sugerido = sorteosDisponibles[0];
      setIdConsultado(String(sugerido.id));
      setTipoSeleccionado('TORNEO');
      consultarTorneo(sugerido.id);
    }
  }, [sorteosDisponibles, searchParams, consultarTorneo]);

  const cambiarTipo = (nuevoTipo: TipoSorteo) => {
    setTipoSeleccionado(nuevoTipo);
    setErrorConsulta(null);
    setDatosTorneo(null);
    setIdConsultado('');
    if (nuevoTipo === 'RIFA') {
      setSearchParams({ tipo: 'rifa' });
    } else if (sorteosDisponibles.length > 0) {
      setIdConsultado(String(sorteosDisponibles[0].id));
      consultarTorneo(sorteosDisponibles[0].id);
    } else {
      setSearchParams({ tipo: 'torneo' });
    }
  };

  const manejarEnvioConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    if (idConsultado.trim()) {
      consultarTorneo(idConsultado.trim());
    }
  };

  const manejarCambioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    if (valor) {
      setIdConsultado(valor);
      consultarTorneo(valor);
    }
  };

  const torneoConsultado = sorteosDisponibles.find((s) => s.id === datosTorneo?.id);

  return (
    <div className="verificacion-container">
      {/* Hero Header */}
      <section className="verificacion-hero">
        <div className="verificacion-hero-header">
          <IconoEscudoCheck size={28} />
          <h1 className="verificacion-hero-title">Portal Público de Verificación Criptográfica</h1>
        </div>
        <p className="verificacion-hero-desc">
          Auditoría abierta y reproducible en el navegador. Comprueba de forma independiente que los
          sorteos de llaves de torneos y rifas son matemáticamente determinísticos y no fueron manipulados.
          Puedes consultar cualquier sorteo realizado, revisar su compromiso previo y recalcular el resultado.
        </p>
      </section>

      {/* Toolbar de Consulta y Tipo */}
      <section className="verificacion-toolbar">
        <div className="verificacion-tipo-tabs">
          <button
            type="button"
            className={`verificacion-tab-btn ${tipoSeleccionado === 'TORNEO' ? 'activo' : ''}`}
            onClick={() => cambiarTipo('TORNEO')}
            data-testid="tab-torneo"
          >
            <IconoTrofeo size={18} />
            <span>Sorteo de Torneo (Bracket)</span>
          </button>
          <button
            type="button"
            className={`verificacion-tab-btn ${tipoSeleccionado === 'RIFA' ? 'activo' : ''}`}
            onClick={() => cambiarTipo('RIFA')}
            data-testid="tab-rifa"
          >
            <IconoRifas size={18} />
            <span>Sorteo de Rifa</span>
          </button>
        </div>

        {tipoSeleccionado === 'TORNEO' && (
        <form onSubmit={manejarEnvioConsulta} className="verificacion-busqueda-row">
          {sorteosDisponibles.length > 0 && (
            <div className="verificacion-input-grupo">
              <label htmlFor="selector-sorteos-disponibles" className="verificacion-label">
                Sorteos realizados recientemente
              </label>
              <select
                id="selector-sorteos-disponibles"
                className="verificacion-select"
                value={idConsultado}
                onChange={manejarCambioSelect}
                data-testid="select-sorteos-publicos"
              >
                <option value="">
                  {cargandoLista ? 'Cargando sorteos...' : 'Selecciona un sorteo...'}
                </option>
                {sorteosDisponibles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo} ({item.disciplinaOInfo})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="verificacion-input-grupo" style={{ maxWidth: '200px' }}>
            <label htmlFor="input-id-sorteo" className="verificacion-label">
              O ingresar ID de Torneo
            </label>
            <input
              id="input-id-sorteo"
              type="text"
              className="verificacion-input"
              placeholder="Ej: 1"
              value={idConsultado}
              onChange={(e) => setIdConsultado(e.target.value)}
              data-testid="input-id-sorteo"
            />
          </div>

          <button
            type="submit"
            className="verificacion-btn-secundario"
            disabled={cargandoSorteo || !idConsultado.trim()}
            data-testid="btn-consultar-sorteo"
            style={{ height: '40px' }}
          >
            <IconoBuscar size={16} />
            <span>Consultar</span>
          </button>
        </form>
        )}
      </section>

      {/* Estados de carga o error */}
      {cargandoSorteo && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} data-testid="cargando-sorteo">
          <IconoRefrescar size={32} className="animar-rotacion" />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>
            Obteniendo datos criptográficos del sorteo...
          </p>
        </div>
      )}

      {errorConsulta && !cargandoSorteo && (
        <div className="verificacion-banner-status discrepancia" data-testid="error-consulta">
          <div className="verificacion-banner-icono">
            <IconoAlerta size={24} />
          </div>
          <div className="verificacion-banner-contenido">
            <h4 className="verificacion-banner-titulo">No se encontró el sorteo</h4>
            <p className="verificacion-banner-desc">{errorConsulta}</p>
          </div>
        </div>
      )}

      {/* Componente según el tipo cargado */}
      {!cargandoSorteo && !errorConsulta && tipoSeleccionado === 'TORNEO' && datosTorneo && (
        <VerificacionTorneo
          key={datosTorneo.id}
          datos={datosTorneo}
          nombre={torneoConsultado?.titulo ?? `Torneo #${datosTorneo.id}`}
          disciplina={torneoConsultado?.disciplinaOInfo ?? null}
        />
      )}

      {/* El sorteo de rifas (PICA-265) todavía no existe en el back */}
      {tipoSeleccionado === 'RIFA' && (
        <div
          data-testid="rifas-sin-sorteo"
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'var(--bg-superficie)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <IconoRifas size={40} />
          <h3 style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>
            Todavía no hay sorteos de rifa para verificar
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Cuando la plataforma sortee la primera rifa, vas a poder revisar acá su compromiso, la
            semilla y los ganadores.
          </p>
        </div>
      )}

      {tipoSeleccionado === 'TORNEO' && !cargandoSorteo && !errorConsulta && !datosTorneo && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'var(--bg-superficie)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <IconoEscudoCheck size={40} />
          <h3 style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>Ningún sorteo seleccionado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Selecciona un sorteo de la lista o ingresa un identificador para auditar los hashes y
            recalcular los resultados.
          </p>
        </div>
      )}
    </div>
  );
};
