import React from 'react';
import { Link } from 'react-router-dom';
import { TorneoResumen } from '../types/torneo';
import { StatusChip } from '../../admin/components/StatusChip';
import { fecha, fechaHora, pesos, valorInscripcion } from '../../shared/formato';
import { formatFormatoTorneo, formatModalidad, formatTipoParticipante } from '../utils/formatters';
import './TorneoCard.css';

interface TorneoCardProps {
  torneo: TorneoResumen;
}

export const TorneoCard: React.FC<TorneoCardProps> = ({ torneo }) => {
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

  return (
    <article className="torneo-card">
      <div className="torneo-card-header">
        <span className="torneo-card-disciplina">⚽ {torneo.disciplina}</span>
        <StatusChip status={torneo.estado} />
      </div>

      <h3 className="torneo-card-title">{torneo.nombre}</h3>

      {torneo.descripcion && <p className="torneo-card-desc">{torneo.descripcion}</p>}

      {/* Modalidad y Tipo de Participante */}
      <div className="torneo-card-tags">
        <span className="torneo-tag">🎯 {formatFormatoTorneo(torneo.formato)}</span>
        <span className="torneo-tag">📍 {formatModalidad(torneo.modalidad)}</span>
        <span className="torneo-tag">👥 {formatTipoParticipante(torneo.tipoParticipante)}</span>
        {torneo.sede && <span className="torneo-tag">🏟️ {torneo.sede}</span>}
      </div>

      {/* Cupos: disponible / total (ej: "7 disponibles de 8") */}
      <div className="torneo-cupos-box">
        <div className="torneo-cupos-header">
          <span className="torneo-cupos-label">
            {torneo.cupoDisponible === 0
              ? 'Cupos agotados'
              : `${torneo.cupoDisponible} disponibles de ${torneo.cupoMaximo}`}
          </span>
          <span className="torneo-cupos-count">{porcentajeOcupacion}% ocupado</span>
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

      {/* Valor de inscripción y pozo estimado */}
      <div className="torneo-metrics-grid">
        <div className="torneo-metric-item">
          <div className="torneo-metric-title">Inscripción</div>
          <div className="torneo-metric-val">{valorInscripcion(torneo.valorInscripcion)}</div>
        </div>
        <div className="torneo-metric-item">
          <div className="torneo-metric-title">Pozo estimado</div>
          <div className="torneo-metric-val">{pesos(torneo.pozoEstimado)}</div>
        </div>
      </div>

      {/* Fechas clave: cierre de inscripción y fecha de inicio */}
      <div className="torneo-fechas-box">
        <div className="torneo-fecha-row">
          <span>⏳ Cierre inscripción:</span>
          <strong>
            {torneo.cierreInscripcionEn ? fechaHora(torneo.cierreInscripcionEn) : 'A definir'}
          </strong>
        </div>
        <div className="torneo-fecha-row">
          <span>🚀 Inicio torneo:</span>
          <strong>{torneo.fechaInicio ? fecha(torneo.fechaInicio) : 'A definir'}</strong>
        </div>
      </div>

      {/* Botón o enlace Ver detalle */}
      <div className="torneo-card-footer">
        <Link
          to={`/torneos/${torneo.slug}`}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%' }}
        >
          Ver detalle →
        </Link>
      </div>
    </article>
  );
};
