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

export const TorneoDetallePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [torneo, setTorneo] = useState<TorneoDetalle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInscripcionModal, setShowInscripcionModal] = useState<boolean>(false);

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
      <div className="torneo-detalle-container">
        <TorneoDetalleSkeleton />
      </div>
    );
  }

  // Pantalla 404 Amigable
  if (isNotFound) {
    return (
      <div className="torneo-detalle-container">
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            margin: '2rem auto',
            maxWidth: '560px',
            borderColor: 'var(--color-danger-border)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🏟️❌</div>
          <h1
            style={{
              fontSize: 'var(--text-xl)',
              marginBottom: 'var(--space-2)',
              color: 'var(--color-danger)',
            }}
          >
            Torneo no encontrado
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-5)',
              fontSize: 'var(--text-md)',
            }}
          >
            El torneo que estás buscando no existe, aún se encuentra en estado borrador o el enlace
            público ha caducado.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <Link to="/" className="btn btn-primary">
              🏆 Ir al Inicio y Explorar Torneos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de Error Genérico
  if (errorMsg || !torneo) {
    return (
      <div className="torneo-detalle-container">
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            margin: '2rem auto',
            maxWidth: '560px',
            borderColor: 'var(--color-danger-border)',
            backgroundColor: 'var(--color-danger-bg)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>⚠️</div>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--color-danger)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Error al consultar el torneo
          </h2>
          <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
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
  const porcentajeOcupacion = Math.min(
    100,
    Math.round((cuposOcupados / (torneo.cupoMaximo || 1)) * 100)
  );

  let progressBarColor = 'var(--color-success)';
  if (torneo.cupoDisponible === 0) {
    progressBarColor = 'var(--color-danger)';
  } else if (torneo.cupoDisponible <= 2) {
    progressBarColor = 'var(--color-warning)';
  }

  // Lógica de inscripción
  const puedeInscribirse = torneo.estado === 'INSCRIPCION_ABIERTA' && torneo.cupoDisponible > 0;

  const handleInscripcionClick = () => {
    if (!isAuthenticated) {
      navigate(`/auth/login?redirect=/torneos/${torneo.slug}`);
    } else {
      setShowInscripcionModal(true);
    }
  };

  return (
    <div className="torneo-detalle-container">
      {/* Navegación Breadcrumb */}
      <nav className="torneo-breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to="/torneos">Torneos</Link>
        <span>/</span>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{torneo.nombre}</span>
      </nav>

      {/* Hero Card Principal */}
      <div className="torneo-hero-card">
        <div className="torneo-hero-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                padding: '0.2rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                textTransform: 'uppercase',
              }}
            >
              ⚽ {torneo.disciplina}
            </span>
            <StatusChip status={torneo.estado} />
          </div>

          {torneo.publicadoEn && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Publicado el {fecha(torneo.publicadoEn)}
            </span>
          )}
        </div>

        <h1 className="torneo-hero-title">{torneo.nombre}</h1>

        {torneo.descripcion && <p className="torneo-hero-desc">{torneo.descripcion}</p>}

        {/* Metadatos */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <span className="badge">🎯 Formato: {formatFormatoTorneo(torneo.formato)}</span>
          <span className="badge">📍 Modalidad: {formatModalidad(torneo.modalidad)}</span>
          <span className="badge">
            👥 Modalidad de juego:{' '}
            {formatTipoParticipante(torneo.tipoParticipante, torneo.tamanioEquipo)}
          </span>
          {torneo.sede && <span className="badge">🏟️ Sede: {torneo.sede}</span>}
        </div>

        {/* Barra de Llamada a la Acción (CTA) */}
        <div className="torneo-cta-bar">
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Valor de inscripción:
            </div>
            <div
              style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)' }}
            >
              {valorInscripcion(torneo.valorInscripcion)}
            </div>
          </div>

          <div>
            {puedeInscribirse ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: 'var(--text-md)' }}
                onClick={handleInscripcionClick}
              >
                {isAuthenticated
                  ? torneo.tipoParticipante === 'EQUIPO'
                    ? '⚡ Inscribir a mi Equipo'
                    : '⚡ Inscribirme al Torneo'
                  : '🔐 Iniciar Sesión para Inscribirme'}
              </button>
            ) : torneo.cupoDisponible === 0 && torneo.estado === 'INSCRIPCION_ABIERTA' ? (
              <button type="button" className="btn btn-secondary" disabled>
                🚫 Cupos Agotados
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" disabled>
                🔒 Inscripción No Disponible
              </button>
            )}
          </div>
        </div>

        {/* Organizador */}
        <div className="torneo-hero-meta">
          <div className="torneo-organizador-box">
            <div className="torneo-organizador-avatar">
              {torneo.organizador?.nombreCompleto?.charAt(0) || 'O'}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Organizador Oficial
              </div>
              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {torneo.organizador?.nombreCompleto || 'Organizador'}
                {torneo.organizador?.username && (
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontWeight: 400,
                      marginLeft: '0.35rem',
                    }}
                  >
                    (@{torneo.organizador.username})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Bloques Informativos */}
      <div className="torneo-detalle-grid">
        {/* Bloque 1: Cupos & Participación */}
        <div className="torneo-block-card">
          <div className="torneo-block-title">
            <span>👥</span>
            <span>Cupos y Participación</span>
          </div>

          <div className="torneo-cupos-box" style={{ margin: 0 }}>
            <div className="torneo-cupos-header">
              <span className="torneo-cupos-label">
                {torneo.cupoDisponible === 0
                  ? 'Cupos agotados'
                  : `${torneo.cupoDisponible} lugares restantes`}
              </span>
              <span className="torneo-cupos-count">
                {cuposOcupados} / {torneo.cupoMaximo} ocupados
              </span>
            </div>
            <div className="torneo-cupos-progress-bg">
              <div
                className="torneo-cupos-progress-fill"
                style={{
                  width: `${porcentajeOcupacion}%`,
                  backgroundColor: progressBarColor,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="torneo-info-row">
              <span className="torneo-info-label">Cupo máximo de inscriptos</span>
              <span className="torneo-info-value">{torneo.cupoMaximo}</span>
            </div>
            <div className="torneo-info-row">
              <span className="torneo-info-label">Cupo mínimo para disputar</span>
              <span className="torneo-info-value">{torneo.cupoMinimo}</span>
            </div>
            <div className="torneo-info-row">
              <span className="torneo-info-label">Modalidad de competencia</span>
              <span className="torneo-info-value">{formatModalidad(torneo.modalidad)}</span>
            </div>
            <div className="torneo-info-row">
              <span className="torneo-info-label">Tipo de participante</span>
              <span className="torneo-info-value">
                {formatTipoParticipante(torneo.tipoParticipante, torneo.tamanioEquipo)}
              </span>
            </div>
            {torneo.sede && (
              <div className="torneo-info-row">
                <span className="torneo-info-label">Sede / Ubicación</span>
                <span className="torneo-info-value">{torneo.sede}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bloque 2: Cronograma y Fechas Clave */}
        <div className="torneo-block-card">
          <div className="torneo-block-title">
            <span>📅</span>
            <span>Cronograma y Fechas</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                ⏳ Cierre de Inscripción
              </div>
              <div
                style={{
                  fontSize: 'var(--text-md)',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  marginTop: '0.2rem',
                }}
              >
                {torneo.cierreInscripcionEn ? fechaHora(torneo.cierreInscripcionEn) : 'A definir'}
              </div>
            </div>

            <div className="torneo-info-row">
              <span className="torneo-info-label">🚀 Inicio del torneo</span>
              <span className="torneo-info-value">
                {torneo.fechaInicio ? fecha(torneo.fechaInicio) : 'A definir'}
              </span>
            </div>

            <div className="torneo-info-row">
              <span className="torneo-info-label">🏁 Fin estimado</span>
              <span className="torneo-info-value">
                {torneo.fechaFin ? fecha(torneo.fechaFin) : 'A definir'}
              </span>
            </div>
          </div>
        </div>

        {/* Bloque 3: Reglamento Oficial */}
        <div className="torneo-block-card">
          <div className="torneo-block-title">
            <span>📜</span>
            <span>Reglamento Oficial</span>
          </div>

          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Consultá las normas oficiales, sistema de puntuación, desempates y condiciones de fair
            play aprobadas para esta competencia.
          </p>

          {torneo.reglamentoUrl ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                marginTop: 'auto',
              }}
            >
              <a
                href={torneo.reglamentoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', gap: '0.5rem' }}
              >
                📄 Descargar / Ver Reglamento (PDF) ↗
              </a>

              {torneo.reglamentoHash && (
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    wordBreak: 'break-all',
                  }}
                  title="Hash SHA-256 de integridad del documento"
                >
                  <strong style={{ color: 'var(--color-text)' }}>SHA-256: </strong>
                  {torneo.reglamentoHash}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                marginTop: 'auto',
              }}
            >
              El organizador aún no ha adjuntado el documento oficial del reglamento.
            </div>
          )}
        </div>
      </div>

      {/* Bloque 4: Pozo y Distribución de Premios */}
      <div className="torneo-block-card">
        <div className="torneo-block-title">
          <span>🏆</span>
          <span>Pozo Estimado y Premiación</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Pozo Estimado Total:
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text)' }}>
            {pesos(torneo.pozoEstimado)}
          </div>
        </div>

        <TorneoPremiosList
          premios={torneo.premios}
          pozoEstimado={torneo.pozoEstimado}
          pctPozoCompetidores={torneo.pctPozoCompetidores}
          pctPremioRifa={torneo.pctPremioRifa}
          moneda={torneo.moneda}
        />
      </div>

      {/* Modal Informativo para Participante Autenticado */}
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
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)', textAlign: 'center' }}
            >
              🎉
            </div>
            <h3
              style={{
                fontSize: 'var(--text-lg)',
                textAlign: 'center',
                marginBottom: 'var(--space-2)',
              }}
            >
              Inscripción a {torneo.nombre}
            </h3>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: 'var(--space-4)',
              }}
            >
              {torneo.tipoParticipante === 'EQUIPO'
                ? `Este torneo es en equipos de ${torneo.tamanioEquipo || ''} personas. El proceso de inscripción de equipos se habilitará en la siguiente fase de desarrollo de la plataforma (HU-209).`
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
    </div>
  );
};
