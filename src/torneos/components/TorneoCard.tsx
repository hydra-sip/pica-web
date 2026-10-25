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

const getDisciplinaIcon = (disciplina: string = ''): string => {
  const d = disciplina.toLowerCase();
  if (d.includes('fútbol') || d.includes('futbol') || d.includes('soccer')) return '⚽';
  if (d.includes('pádel') || d.includes('padel') || d.includes('tenis')) return '🎾';
  if (d.includes('básquet') || d.includes('basquet') || d.includes('basket')) return '🏀';
  if (d.includes('esport') || d.includes('gaming') || d.includes('fifa') || d.includes('valorant') || d.includes('lol')) return '🎮';
  if (d.includes('vóley') || d.includes('voley') || d.includes('voleibol')) return '🏐';
  return '🏆';
};

export const TorneoCard: React.FC<TorneoCardProps> = ({ torneo }) => {
  const pozoLabel =
    torneo.estado === 'EN_CURSO' || torneo.estado === 'FINALIZADO'
      ? 'Pozo Garantizado en Custodia'
      : 'Pozo Estimado en Custodia';

  let btnLabel = 'Ver Detalle del Torneo';
  let btnClass = 'btn-secondary';
  if (torneo.estado === 'EN_CURSO') {
    btnLabel = 'Ver Bracket en Vivo';
    btnClass = 'btn-primary';
  } else if (torneo.estado === 'INSCRIPCION_ABIERTA') {
    btnLabel = torneo.tipoParticipante === 'EQUIPO' ? 'Inscribir Equipo' : 'Inscribirme al Torneo';
    btnClass = 'btn-emerald';
  }

  const sedeFormato = `${torneo.sede || 'Sede central'} • ${formatFormatoTorneo(torneo.formato)} (${torneo.cupoMaximo} ${torneo.tipoParticipante === 'EQUIPO' ? 'eq.' : 'jug.'})`;

  // Métricas de cupos y progreso visual
  const cuposTotales = torneo.cupoMaximo || 1;
  const cuposOcupados = Math.max(0, cuposTotales - torneo.cupoDisponible);
  const pctOcupacion = Math.min(100, Math.round((cuposOcupados / cuposTotales) * 100));
  const esAgotado = torneo.cupoDisponible === 0;
  const esCasiLleno = torneo.cupoDisponible > 0 && torneo.cupoDisponible <= 2;

  return (
    <article className="hydra-card torneo-card-elevated">
      <div className="torneo-card-top">
        <StatusChip status={torneo.estado} />
        {torneo.disciplina && (
          <span className="torneo-card-disciplina-pill">
            <span className="disciplina-emoji">{getDisciplinaIcon(torneo.disciplina)}</span>
            <span>{torneo.disciplina}</span>
          </span>
        )}
      </div>

      <h3 className="torneo-card-title">
        <Link to={`/torneos/${torneo.slug}`} className="torneo-title-link">
          {torneo.nombre}
        </Link>
      </h3>

      <p className="torneo-card-subtitle">{sedeFormato}</p>

      {/* Pozo de Premios Destacado (High-Stakes Trophy Box) */}
      <div className="torneo-pozo-box">
        <div className="torneo-pozo-left">
          <div className="torneo-pozo-icon" aria-hidden="true">
            🏆
          </div>
          <div>
            <span className="torneo-pozo-label">{pozoLabel}</span>
            <span className="torneo-pozo-amount">{pesos(torneo.pozoEstimado)}</span>
          </div>
        </div>
        <span className="torneo-pozo-tag">Escrow</span>
      </div>

      {/* Barra de Progreso de Cupos */}
      <div className="torneo-cupos-section">
        <div className="torneo-cupos-header">
          <span className={`torneo-cupos-status ${esAgotado ? 'status-agotado' : esCasiLleno ? 'status-alerta' : ''}`}>
            {esAgotado
              ? '🚫 Cupos agotados'
              : esCasiLleno
              ? `🔥 ¡Últimos ${torneo.cupoDisponible} cupos!`
              : `Quedan ${torneo.cupoDisponible} cupos`}
          </span>
          <span className="torneo-cupos-ratio">
            {cuposOcupados}/{cuposTotales}
          </span>
        </div>
        <div className="torneo-cupos-progress-track">
          <div
            className={`torneo-cupos-progress-fill ${esAgotado ? 'fill-agotado' : esCasiLleno ? 'fill-alerta' : 'fill-normal'}`}
            style={{ width: `${pctOcupacion}%` }}
          />
        </div>
      </div>

      <div className="torneo-card-extra">
        <div className="torneo-extra-item">
          <span className="torneo-extra-label">Inscripción:</span>
          <strong>{valorInscripcion(torneo.valorInscripcion)}</strong>
        </div>
        {torneo.fechaInicio && (
          <div className="torneo-extra-item">
            <span className="torneo-extra-label">Comienza:</span>
            <strong>{fecha(torneo.fechaInicio)}</strong>
          </div>
        )}
      </div>

      <Link
        to={`/torneos/${torneo.slug}`}
        className={`btn ${btnClass} torneo-card-btn`}
      >
        {btnLabel} →
      </Link>
    </article>
  );
};
