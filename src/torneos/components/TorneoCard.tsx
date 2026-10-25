import React from 'react';
import { Link } from 'react-router-dom';
import { TorneoResumen } from '../types/torneo';
import { StatusChip } from '../../admin/components/StatusChip';
import { fecha, pesos, valorInscripcion } from '../../shared/formato';
import { formatFormatoTorneo } from '../utils/formatters';
import './TorneoCard.css';

interface TorneoCardProps {
  torneo: TorneoResumen;
}

export const TorneoCard: React.FC<TorneoCardProps> = ({ torneo }) => {
  const pozoLabel =
    torneo.estado === 'EN_CURSO' || torneo.estado === 'FINALIZADO'
      ? 'Pozo Garantizado en Custodia'
      : 'Pozo Estimado en Custodia';

  let btnLabel = 'Ver Detalle del Torneo';
  if (torneo.estado === 'EN_CURSO') {
    btnLabel = 'Ver Bracket en Vivo';
  } else if (torneo.estado === 'INSCRIPCION_ABIERTA') {
    btnLabel = torneo.tipoParticipante === 'EQUIPO' ? 'Inscribir Equipo' : 'Inscribirme al Torneo';
  }

  const sedeFormato = `${torneo.sede || 'Sede central'} • ${formatFormatoTorneo(torneo.formato)} (${torneo.cupoMaximo} ${torneo.tipoParticipante === 'EQUIPO' ? 'eq.' : 'jug.'})`;

  return (
    <article className="hydra-card torneo-card-figma">
      <div className="torneo-card-top">
        <StatusChip status={torneo.estado} />
        {torneo.disciplina && (
          <span className="torneo-card-disciplina-pill">⚽ {torneo.disciplina}</span>
        )}
      </div>

      <h3 className="torneo-card-title">
        <Link to={`/torneos/${torneo.slug}`} className="torneo-title-link">
          {torneo.nombre}
        </Link>
      </h3>

      <p className="torneo-card-subtitle">{sedeFormato}</p>

      <div className="torneo-card-divider" />

      <div className="torneo-card-metrics">
        <div>
          <span className="torneo-metric-label">{pozoLabel}</span>
          <span className="torneo-metric-value">{pesos(torneo.pozoEstimado)}</span>
        </div>
        <div className="torneo-card-cupos">
          <span className="torneo-cupos-text">
            {torneo.cupoDisponible === 0
              ? 'Cupos agotados'
              : `Quedan ${torneo.cupoDisponible} cupos`}
          </span>
          <span className="torneo-cupos-sub">
            {torneo.cupoDisponible} disp. de {torneo.cupoMaximo}
          </span>
        </div>
      </div>

      <div className="torneo-card-extra">
        <span>
          Inscripción: <strong>{valorInscripcion(torneo.valorInscripcion)}</strong>
        </span>
        {torneo.fechaInicio && (
          <span>
            Inicio: <strong>{fecha(torneo.fechaInicio)}</strong>
          </span>
        )}
      </div>

      <Link
        to={`/torneos/${torneo.slug}`}
        className={`btn ${torneo.estado === 'EN_CURSO' ? 'btn-primary' : 'btn-secondary'} torneo-card-btn`}
      >
        {btnLabel} →
      </Link>
    </article>
  );
};
