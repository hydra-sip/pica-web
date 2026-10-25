import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { torneoApi } from '../../api/torneoApi';
import { ApiError } from '../../api/httpClient';
import { TorneoDetalle } from '../types/torneo';
import { StatusChip } from '../../admin/components/StatusChip';
import { TorneoPremiosList } from '../components/TorneoPremiosList';
import { TorneoDetalleSkeleton } from '../components/TorneoSkeleton';
import { useAuth } from '../../auth/hooks/useAuth';
import { fecha, fechaHora, pesos, valorInscripcion } from '../../shared/formato';
import { formatFormatoTorneo, formatModalidad, formatTipoParticipante } from '../utils/formatters';
import './TorneoDetallePage.css';

type DetalleTab = 'info' | 'bracket' | 'pronosticos' | 'reglas';

export const TorneoDetallePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [torneo, setTorneo] = useState<TorneoDetalle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetalleTab>('info');
  const [showInscripcionModal, setShowInscripcionModal] = useState<boolean>(false);
  const [showReportarModal, setShowReportarModal] = useState<boolean>(false);

  const fetchTorneoDetalle = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMsg(null);

    try {
      const data = await torneoApi.getTorneoBySlug(slug);
      setTorneo(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al consultar los datos del torneo.';
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTorneoDetalle();
  }, [fetchTorneoDetalle]);

  // Pantalla de Carga
  if (isLoading) {
    return (
      <div className="torneo-detalle-figma-container">
        <TorneoDetalleSkeleton />
      </div>
    );
  }

  // Pantalla 404 Amigable
  if (isNotFound) {
    return (
      <div className="torneo-detalle-figma-container">
        <div
          className="hydra-card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            margin: '2rem auto',
            maxWidth: '560px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏟️❌</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Torneo no encontrado
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            El torneo que estás buscando no existe, aún se encuentra en estado borrador o el enlace público ha caducado.
          </p>
          <Link to="/" className="btn btn-primary">
            🏆 Volver al Inicio y Explorar Torneos
          </Link>
        </div>
      </div>
    );
  }

  // Pantalla de Error Genérico
  if (errorMsg || !torneo) {
    return (
      <div className="torneo-detalle-figma-container">
        <div
          className="hydra-card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            margin: '2rem auto',
            maxWidth: '560px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Error al consultar el torneo
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {errorMsg || 'No se pudo obtener la información solicitada.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={fetchTorneoDetalle}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Cálculos de cupos y progreso
  const cuposOcupados = Math.max(0, torneo.cupoMaximo - torneo.cupoDisponible);
  const puedeInscribirse = torneo.estado === 'INSCRIPCION_ABIERTA' && torneo.cupoDisponible > 0;

  const handleInscripcionClick = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=/torneos/${torneo.slug}`);
    } else {
      setShowInscripcionModal(true);
    }
  };

  return (
    <div className="torneo-detalle-figma-container">
      {/* Header bar (Figma #37:3) */}
      <div className="torneo-figma-header">
        <Link to="/" className="torneo-back-btn" title="Volver al catálogo" aria-label="Volver">
          ←
        </Link>
        <h1 className="torneo-header-title">{torneo.nombre}</h1>
        <button
          type="button"
          className="torneo-options-btn"
          aria-label="Opciones"
          title="Compartir o copiar enlace"
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
              alert('Enlace del torneo copiado al portapapeles');
            }
          }}
        >
          ⋯
        </button>
      </div>

      {/* Bolsa de Premios del Torneo (Figma Wireframe #33:634) */}
      <div className="bolsa-premios-card">
        <div className="bolsa-premios-header">
          <div className="bolsa-premios-title">
            <span>🏆 Bolsa de Premios del Torneo</span>
          </div>
          <span className="bolsa-escrow-badge">🛡️ Custodia Criptográfica OK</span>
        </div>
        <div className="bolsa-premios-row">
          <span className="bolsa-premios-label">Pozo Total en Custodia Hydra:</span>
          <span className="bolsa-premios-val-bold">{pesos(torneo.pozoEstimado)}</span>
        </div>
        <div className="bolsa-premios-secondary">
          <span>Distribución automatizada por acta arbitral homologada</span>
          <span>100% fondos garantizados</span>
        </div>
      </div>

      {/* Tabs Switcher (Figma Wireframe #33:641) */}
      <div className="torneo-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'info'}
          className={`torneo-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bracket'}
          className={`torneo-tab-btn ${activeTab === 'bracket' ? 'active' : ''}`}
          onClick={() => setActiveTab('bracket')}
        >
          Bracket en Vivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pronosticos'}
          className={`torneo-tab-btn ${activeTab === 'pronosticos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pronosticos')}
        >
          Pronósticos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reglas'}
          className={`torneo-tab-btn ${activeTab === 'reglas' ? 'active' : ''}`}
          onClick={() => setActiveTab('reglas')}
        >
          Reglas
        </button>
      </div>

      {/* Tab 1: Info (Criterio 2: cupo disponible, valor inscripción, pozo estimado, fechas, reglamento) */}
      {activeTab === 'info' && (
        <div className="torneo-tab-content">
          <div className="hydra-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <StatusChip status={torneo.estado} />
              <span className="badge">⚽ {torneo.disciplina}</span>
              {torneo.sede && <span className="badge">🏟️ {torneo.sede}</span>}
            </div>

            {torneo.descripcion && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                {torneo.descripcion}
              </p>
            )}

            {/* Cupos y Valor de Inscripción */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: torneo.cupoDisponible <= 2 ? '#b45309' : 'var(--text-primary)' }}>
                  {torneo.cupoDisponible === 0
                    ? '🚫 Cupos agotados'
                    : torneo.cupoDisponible <= 2
                    ? `🔥 ¡Últimos ${torneo.cupoDisponible} cupos disponibles!`
                    : `Ocupación: ${cuposOcupados} de ${torneo.cupoMaximo} cupos confirmados`}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {Math.min(100, Math.round((cuposOcupados / (torneo.cupoMaximo || 1)) * 100))}%
                </span>
              </div>
              <div className="torneo-cupos-progress-track" style={{ height: '8px' }}>
                <div
                  className={`torneo-cupos-progress-fill ${torneo.cupoDisponible === 0 ? 'fill-agotado' : torneo.cupoDisponible <= 2 ? 'fill-alerta' : 'fill-normal'}`}
                  style={{ width: `${Math.min(100, Math.round((cuposOcupados / (torneo.cupoMaximo || 1)) * 100))}%` }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                  Cupos Disponibles
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {torneo.cupoDisponible} de {torneo.cupoMaximo}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                  ({cuposOcupados} inscriptos)
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                  Valor de Inscripción
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {valorInscripcion(torneo.valorInscripcion)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                  {torneo.tipoParticipante === 'EQUIPO' ? `Por equipo (${torneo.tamanioEquipo || 5} jug.)` : 'Por jugador individual'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                  Pozo Estimado
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-black)' }}>
                  {pesos(torneo.pozoEstimado)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                  Custodia garantizada
                </span>
              </div>
            </div>

            {/* Fechas Clave */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>⏳ Cierre de Inscripción:</span>
                <strong>{torneo.cierreInscripcionEn ? fechaHora(torneo.cierreInscripcionEn) : 'A definir'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>🚀 Inicio de Competencia:</span>
                <strong>{torneo.fechaInicio ? fecha(torneo.fechaInicio) : 'A definir'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>👥 Participación:</span>
                <strong>{formatTipoParticipante(torneo.tipoParticipante, torneo.tamanioEquipo)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>🎯 Formato y Modalidad:</span>
                <strong>{formatFormatoTorneo(torneo.formato)} • {formatModalidad(torneo.modalidad)}</strong>
              </div>
            </div>

            {/* CTA Button */}
            {puedeInscribirse ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={handleInscripcionClick}
              >
                {isAuthenticated
                  ? torneo.tipoParticipante === 'EQUIPO'
                    ? '⚡ Inscribir Mi Equipo'
                    : '⚡ Inscribirme al Torneo'
                  : '🔐 Iniciar Sesión para Inscribirme'}
              </button>
            ) : torneo.cupoDisponible === 0 && torneo.estado === 'INSCRIPCION_ABIERTA' ? (
              <button type="button" className="btn btn-secondary" disabled style={{ width: '100%', padding: '0.85rem' }}>
                🚫 Cupos Agotados
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" disabled style={{ width: '100%', padding: '0.85rem' }}>
                🔒 Inscripción No Disponible
              </button>
            )}
          </div>

          {/* Premiación por puesto */}
          <div className="hydra-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              🏆 Distribución de Premios
            </h2>
            <TorneoPremiosList
              premios={torneo.premios}
              pozoEstimado={torneo.pozoEstimado}
              pctPozoCompetidores={torneo.pctPozoCompetidores}
              pctPremioRifa={torneo.pctPremioRifa}
              moneda={torneo.moneda}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Bracket en Vivo (Figma Wireframe #33:648 - #33:692) */}
      {activeTab === 'bracket' && (
        <div className="torneo-tab-content">
          <div className="bracket-header-row">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Fase: Cuartos de Final
            </h2>
            <div className="bracket-updating-chip">
              <span className="bracket-pulse-dot" />
              <span>Actualizando</span>
            </div>
          </div>

          <div className="bracket-tree-container">
            {/* Match 1 (Figma #33:653) */}
            <div className="bracket-match-box active">
              <div className="bracket-team-row">
                <span className="bracket-team-name winner">Los Galácticos</span>
                <span className="bracket-team-score">3</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
              <div className="bracket-team-row">
                <span className="bracket-team-name muted">Deportivo Luján</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-secondary)' }}>1</span>
              </div>
            </div>

            {/* Match 2 (Figma #33:661) */}
            <div className="bracket-match-box">
              <div className="bracket-team-row">
                <span className="bracket-team-name winner">La Furia FC</span>
                <span className="bracket-team-score">2 (4)</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
              <div className="bracket-team-row">
                <span className="bracket-team-name muted">El Rejunte</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-secondary)' }}>2 (3)</span>
              </div>
            </div>

            {/* Semifinal Cruce (Figma #33:669) */}
            <div className="bracket-match-box" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Semifinal 1
              </div>
              <div className="bracket-team-row">
                <span className="bracket-team-name">Galácticos</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
              <div className="bracket-team-row">
                <span className="bracket-team-name">La Furia</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
            </div>

            {/* Match 3 (Figma #33:676) */}
            <div className="bracket-match-box">
              <div className="bracket-team-row">
                <span className="bracket-team-name">Atlético Luján</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
              <div className="bracket-team-row">
                <span className="bracket-team-name">Los Troncos FC</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
            </div>

            {/* Match 4 (Figma #33:681) */}
            <div className="bracket-match-box">
              <div className="bracket-team-row">
                <span className="bracket-team-name">Paso a Paso</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
              <div className="bracket-team-row">
                <span className="bracket-team-name">Real Coholicos</span>
                <span className="bracket-team-score" style={{ color: 'var(--text-muted)' }}>-</span>
              </div>
            </div>
          </div>

          {/* Captain Next Match Banner (Figma Wireframe #33:686) */}
          <div className="captain-match-banner">
            <span className="captain-banner-subtitle">
              Tu próximo cruce (Capitán Galácticos):
            </span>
            <h3 className="captain-banner-title">
              Semifinal vs La Furia FC
            </h3>
            <span className="captain-banner-details">
              Cancha 1 • Hoy 21:30 hs • Árbitro: M. Gomez
            </span>
            <button
              type="button"
              className="btn btn-primary captain-report-btn"
              onClick={() => setShowReportarModal(true)}
            >
              Reportar Marcador de Partido
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Pronósticos */}
      {activeTab === 'pronosticos' && (
        <div className="torneo-tab-content">
          <div className="hydra-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              🎯 Pronósticos de la Comunidad
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Votá por los equipos favoritos de los cruces y acumulá puntos en el ranking de la plataforma.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Semifinal 1: Galácticos vs La Furia FC
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}>
                    Galácticos (62%)
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}>
                    La Furia (38%)
                  </button>
                </div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Cuartos 3: Atlético Luján vs Los Troncos FC
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}>
                    Atlético Luján (51%)
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}>
                    Los Troncos FC (49%)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reglas (Reglamento Oficial PDF + SHA-256) */}
      {activeTab === 'reglas' && (
        <div className="torneo-tab-content">
          <div className="hydra-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              📜 Reglamento Oficial de la Competencia
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Consultá las normas oficiales, sistema de puntuación, desempates y condiciones de fair play aprobadas para esta competencia bajo la custodia y trazabilidad de Hydra.
            </p>

            {torneo.reglamentoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <a
                  href={torneo.reglamentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  📄 Descargar Reglamento Oficial (PDF) ↗
                </a>

                {torneo.reglamentoHash && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                        <span>🛡️</span> Sello de Integridad Criptográfica SHA-256
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        Inmutable • Verificado
                      </span>
                    </div>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all', display: 'block' }}>
                      {torneo.reglamentoHash}
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                }}
              >
                El organizador no ha adjuntado documento PDF adicional para este torneo. Rigen las normas generales de la disciplina.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Inscripción Informativo */}
      {showInscripcionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowInscripcionModal(false)}
        >
          <div
            className="hydra-card"
            style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>🎉</div>
            <h3 style={{ fontSize: '1.2rem', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 800 }}>
              Inscripción a {torneo.nombre}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, textAlign: 'center', marginBottom: '1.5rem' }}>
              {torneo.tipoParticipante === 'EQUIPO'
                ? `Este torneo es en equipos de ${torneo.tamanioEquipo || 5} personas. El proceso de inscripción de equipos se habilitará en la siguiente fase de desarrollo de la plataforma (HU-209).`
                : 'El proceso de registro individual se habilitará en la siguiente fase de desarrollo de la plataforma (HU-209).'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowInscripcionModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reportar Marcador (Figma Frame #37:4) */}
      {showReportarModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowReportarModal(false)}
        >
          <div
            className="hydra-card"
            style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>
              Reportar Marcador de Partido
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.25rem' }}>
              Semifinal: Los Galácticos vs La Furia FC
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Galácticos</span>
                <input type="number" defaultValue={0} min={0} style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>vs</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>La Furia</span>
                <input type="number" defaultValue={0} min={0} style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowReportarModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  alert('Resultado registrado exitosamente en custodia.');
                  setShowReportarModal(false);
                }}
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
