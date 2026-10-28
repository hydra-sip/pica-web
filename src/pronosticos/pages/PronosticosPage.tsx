import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { Eleccion, FilaRanking, PartidoPronostico, pronosticoApi } from '../../api/pronosticoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import {
  IconoAlerta,
  IconoCheck,
  IconoPodio,
  IconoPronosticos,
  IconoRefrescar,
} from '../../shared/ui/Iconos';
import { PartidoPronosticoCard } from '../components/PartidoPronosticoCard';
import { TablaRanking } from '../components/TablaRanking';
import '../pronosticos.css';

type TabPronosticos = 'partidos' | 'ranking' | 'mis_pronosticos';
type FiltroEstado = 'todos' | 'abiertos' | 'cerrados';

export const PronosticosPage: React.FC = () => {
  const { user } = useAuth();

  const [tabActiva, setTabActiva] = useState<TabPronosticos>('partidos');
  const [partidos, setPartidos] = useState<PartidoPronostico[]>([]);
  const [ranking, setRanking] = useState<FilaRanking[]>([]);
  const [torneoFiltro, setTorneoFiltro] = useState<number | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avisoExito, setAvisoExito] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const torneoId = torneoFiltro !== '' ? torneoFiltro : undefined;
      const [listaPartidos, listaRanking] = await Promise.all([
        pronosticoApi.listarPartidos({ torneoId }),
        pronosticoApi.ranking(torneoId),
      ]);
      setPartidos(listaPartidos);
      setRanking(listaRanking);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los pronósticos y ranking.'));
    } finally {
      setCargando(false);
    }
  }, [torneoFiltro]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Lista única de torneos a partir de los partidos disponibles
  const torneosDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    partidos.forEach((p) => {
      if (!map.has(p.torneoId)) {
        map.set(p.torneoId, p.torneoNombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [partidos]);

  const handleGuardarPronostico = async (partidoId: number, eleccion: Eleccion) => {
    setError(null);
    setAvisoExito(null);

    const detalle = await pronosticoApi.guardarPronostico(partidoId, eleccion);

    // Actualizar estado local inmediatamente
    setPartidos((prev) =>
      prev.map((p) =>
        p.partidoId === partidoId
          ? {
              ...p,
              miPronostico: {
                eleccion: detalle.eleccion,
                puntos: detalle.puntos,
                creadoEn: detalle.creadoEn,
                modificadoEn: detalle.modificadoEn,
              },
            }
          : p
      )
    );

    setAvisoExito('Pronóstico registrado correctamente.');
    setTimeout(() => {
      setAvisoExito((curr) => (curr === 'Pronóstico registrado correctamente.' ? null : curr));
    }, 3500);
  };

  // Filtrado de partidos según pestaña y chip de estado
  const partidosFiltrados = useMemo(() => {
    return partidos.filter((p) => {
      if (tabActiva === 'mis_pronosticos') {
        if (!p.miPronostico) return false;
      }
      if (filtroEstado === 'abiertos') return p.abierto;
      if (filtroEstado === 'cerrados') return !p.abierto;
      return true;
    });
  }, [partidos, tabActiva, filtroEstado]);

  const partidosAbiertosCount = useMemo(() => {
    return partidos.filter((p) => p.abierto).length;
  }, [partidos]);

  const misPronosticosCount = useMemo(() => {
    return partidos.filter((p) => p.miPronostico != null).length;
  }, [partidos]);

  return (
    <div className="pronosticos-page">
      {/* Cabecera */}
      <header className="pronosticos-header">
        <div className="pronosticos-titulo-seccion">
          <div className="pronosticos-icono-cabecera">
            <IconoPronosticos size={26} />
          </div>
          <div>
            <h1 className="pronosticos-titulo">Pronósticos y Ranking</h1>
            <p className="pronosticos-subtitulo">
              Pronosticá los cruces de los torneos, acumulá puntos y competí en la tabla de posiciones oficial.
            </p>
          </div>
        </div>

        {/* Tarjeta explicativa del esquema de puntuación */}
        <div className="pronosticos-reglas-card">
          <IconoPodio size={20} style={{ color: 'var(--color-primary)', marginTop: '2px' }} />
          <div>
            <div>
              <strong>Esquema de puntuación oficial: </strong>
              Elegí entre <strong>Local (1)</strong>, <strong>Empate (X)</strong> o <strong>Visitante (2)</strong> antes del inicio de cada cruce.
            </div>
            <div className="pronosticos-reglas-puntos">
              <span className="pronosticos-regla-tag" title="Puntaje por resultado acertado">
                <IconoCheck size={12} style={{ color: '#16a34a' }} />
                +3 puntos por acierto
              </span>
              <span className="pronosticos-regla-tag" title="Puntaje por resultado fallado">
                0 puntos por desacierto
              </span>
              <span className="pronosticos-regla-tag" title="Ventana permitida">
                Modificable hasta el inicio del partido
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Avisos globales */}
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          <IconoAlerta size={16} />
          <span>{error}</span>
        </div>
      )}

      {avisoExito && (
        <div className="alerta alerta-exito" role="status">
          <IconoCheck size={16} />
          <span>{avisoExito}</span>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="pronosticos-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tabActiva === 'partidos'}
          className={`pronosticos-tab-btn ${tabActiva === 'partidos' ? 'activo' : ''}`}
          onClick={() => setTabActiva('partidos')}
        >
          <IconoPronosticos size={18} />
          <span>Partidos y Pronósticos</span>
          {partidosAbiertosCount > 0 && (
            <span className="pronosticos-tab-badge" title="Partidos abiertos para pronosticar">
              {partidosAbiertosCount}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tabActiva === 'mis_pronosticos'}
          className={`pronosticos-tab-btn ${tabActiva === 'mis_pronosticos' ? 'activo' : ''}`}
          onClick={() => setTabActiva('mis_pronosticos')}
        >
          <IconoCheck size={18} />
          <span>Mis Pronósticos</span>
          {misPronosticosCount > 0 && (
            <span className="pronosticos-tab-badge">{misPronosticosCount}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tabActiva === 'ranking'}
          className={`pronosticos-tab-btn ${tabActiva === 'ranking' ? 'activo' : ''}`}
          onClick={() => setTabActiva('ranking')}
        >
          <IconoPodio size={18} />
          <span>Tabla de Posiciones / Ranking</span>
        </button>
      </div>

      {/* Barra de Filtros y Acciones */}
      <div className="pronosticos-toolbar">
        <div className="pronosticos-filtro-grupo">
          <label htmlFor="filtro-torneo" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            Torneo:
          </label>
          <select
            id="filtro-torneo"
            className="pronosticos-select"
            value={torneoFiltro}
            onChange={(e) => setTorneoFiltro(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los torneos</option>
            {torneosDisponibles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>

          {tabActiva !== 'ranking' && (
            <div className="pronosticos-chips">
              <button
                type="button"
                className={`pronosticos-chip-btn ${filtroEstado === 'todos' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`pronosticos-chip-btn ${filtroEstado === 'abiertos' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('abiertos')}
              >
                Abiertos
              </button>
              <button
                type="button"
                className={`pronosticos-chip-btn ${filtroEstado === 'cerrados' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('cerrados')}
              >
                Cerrados / Finalizados
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={cargarDatos}
          disabled={cargando}
          title="Actualizar datos"
        >
          <IconoRefrescar size={14} className={cargando ? 'animacion-rotar' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      {cargando && partidos.length === 0 ? (
        <div className="pronosticos-cargando">
          <IconoRefrescar size={20} className="animacion-rotar" />
          <span>Cargando partidos y tabla de posiciones...</span>
        </div>
      ) : tabActiva === 'ranking' ? (
        <TablaRanking ranking={ranking} usuarioActualId={user?.id} />
      ) : (
        <div>
          {partidosFiltrados.length === 0 ? (
            <div className="pronosticos-vacio">
              <IconoPronosticos size={40} />
              <h3>No hay partidos en esta vista</h3>
              <p>
                {tabActiva === 'mis_pronosticos'
                  ? 'Aún no cargaste ningún pronóstico. Seleccioná "Partidos y Pronósticos" para empezar a participar.'
                  : 'No se encontraron partidos con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="pronosticos-grid">
              {partidosFiltrados.map((partido) => (
                <PartidoPronosticoCard
                  key={partido.partidoId}
                  partido={partido}
                  onGuardarPronostico={handleGuardarPronostico}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
