import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RifaVerificacionData,
  SorteoItemResumen,
  TipoSorteo,
  TorneoVerificacionData,
  verificacionApi,
} from '../../api/verificacionApi';
import {
  IconoAlerta,
  IconoBuscar,
  IconoEscudoCheck,
  IconoRefrescar,
  IconoRifas,
  IconoTrofeo,
} from '../../shared/ui/Iconos';
import { VerificacionRifa } from '../components/VerificacionRifa';
import { VerificacionTorneo } from '../components/VerificacionTorneo';
import '../verificacion.css';

export const PortalVerificacionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tipo seleccionado: TORNEO o RIFA
  const tipoParam = searchParams.get('tipo');
  const tipoInicial: TipoSorteo = tipoParam?.toUpperCase() === 'RIFA' ? 'RIFA' : 'TORNEO';
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSorteo>(tipoInicial);

  // Lista de sorteos disponibles
  const [sorteosDisponibles, setSorteosDisponibles] = useState<SorteoItemResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  // ID actual
  const [idConsultado, setIdConsultado] = useState<string>(searchParams.get('id') || '');

  // Datos del sorteo consultado
  const [datosTorneo, setDatosTorneo] = useState<TorneoVerificacionData | null>(null);
  const [datosRifa, setDatosRifa] = useState<RifaVerificacionData | null>(null);
  const [cargandoSorteo, setCargandoSorteo] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);

  // Cargar lista disponible
  useEffect(() => {
    let vigente = true;
    setCargandoLista(true);
    verificacionApi
      .listarDisponibles()
      .then((items) => {
        if (!vigente) return;
        setSorteosDisponibles(items);
      })
      .catch(() => {
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

  const consultarSorteo = useCallback(
    async (tipo: TipoSorteo, id: string | number) => {
      if (!id) return;
      setCargandoSorteo(true);
      setErrorConsulta(null);

      // Sincronizar query params
      setSearchParams({ tipo: tipo.toLowerCase(), id: String(id) });

      try {
        if (tipo === 'TORNEO') {
          const res = await verificacionApi.obtenerTorneo(id);
          setDatosTorneo(res);
          setDatosRifa(null);
        } else {
          const res = await verificacionApi.obtenerRifa(id);
          setDatosRifa(res);
          setDatosTorneo(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo cargar el sorteo especificado.';
        setErrorConsulta(msg);
        setDatosTorneo(null);
        setDatosRifa(null);
      } finally {
        setCargandoSorteo(false);
      }
    },
    [setSearchParams]
  );

  // Consultar en el montaje si viene un id en searchParams o seleccionar el primero disponible
  useEffect(() => {
    const idUrl = searchParams.get('id');
    const tipoUrl = searchParams.get('tipo')?.toUpperCase() === 'RIFA' ? 'RIFA' : 'TORNEO';

    if (idUrl) {
      setIdConsultado(idUrl);
      setTipoSeleccionado(tipoUrl);
      consultarSorteo(tipoUrl, idUrl);
    } else if (sorteosDisponibles.length > 0) {
      const sugerido =
        sorteosDisponibles.find((s) => s.tipo === tipoUrl) || sorteosDisponibles[0];
      if (sugerido) {
        setIdConsultado(String(sugerido.id));
        setTipoSeleccionado(sugerido.tipo);
        consultarSorteo(sugerido.tipo, sugerido.id);
      }
    }
  }, [sorteosDisponibles, searchParams, consultarSorteo]);

  const cambiarTipo = (nuevoTipo: TipoSorteo) => {
    setTipoSeleccionado(nuevoTipo);
    setErrorConsulta(null);

    // Buscar si hay algún sorteo de este tipo en la lista para sugerirlo
    const primerDelTipo = sorteosDisponibles.find((s) => s.tipo === nuevoTipo);
    if (primerDelTipo) {
      setIdConsultado(String(primerDelTipo.id));
      consultarSorteo(nuevoTipo, primerDelTipo.id);
    } else {
      setIdConsultado('');
      setDatosTorneo(null);
      setDatosRifa(null);
      setSearchParams({ tipo: nuevoTipo.toLowerCase() });
    }
  };

  const manejarEnvioConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    if (idConsultado.trim()) {
      consultarSorteo(tipoSeleccionado, idConsultado.trim());
    }
  };

  const manejarCambioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    if (valor) {
      setIdConsultado(valor);
      consultarSorteo(tipoSeleccionado, valor);
    }
  };

  const listaFiltrada = sorteosDisponibles.filter((s) => s.tipo === tipoSeleccionado);

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

        <form onSubmit={manejarEnvioConsulta} className="verificacion-busqueda-row">
          {listaFiltrada.length > 0 && (
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
                {listaFiltrada.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo} ({item.disciplinaOInfo})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="verificacion-input-grupo" style={{ maxWidth: '200px' }}>
            <label htmlFor="input-id-sorteo" className="verificacion-label">
              O ingresar ID de {tipoSeleccionado === 'TORNEO' ? 'Torneo' : 'Rifa'}
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
        <VerificacionTorneo datos={datosTorneo} />
      )}

      {!cargandoSorteo && !errorConsulta && tipoSeleccionado === 'RIFA' && datosRifa && (
        <VerificacionRifa datos={datosRifa} />
      )}

      {!cargandoSorteo && !errorConsulta && !datosTorneo && !datosRifa && (
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
