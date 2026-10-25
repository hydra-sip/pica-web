import React, { useEffect, useState } from 'react';
import { EstadoTorneo } from '../types/torneo';
import './TorneoFilters.css';

interface TorneoFiltersProps {
  disciplina: string;
  estado: EstadoTorneo | '';
  onDisciplinaChange: (disciplina: string) => void;
  onEstadoChange: (estado: EstadoTorneo | '') => void;
  onReset: () => void;
}

interface CategoriaFiltro {
  label: string;
  query: string;
  icon: string;
}

const CATEGORIAS_FILTRO: CategoriaFiltro[] = [
  { label: 'Todos', query: '', icon: '🔥' },
  { label: 'Fútbol 5', query: 'Fútbol 5', icon: '⚽' },
  { label: 'Pádel', query: 'Pádel', icon: '🎾' },
  { label: 'Básquet', query: 'Básquet', icon: '🏀' },
  { label: 'Esports', query: 'Esports', icon: '🎮' },
  { label: 'Presencial', query: 'Presencial', icon: '📍' },
  { label: 'Online', query: 'Online', icon: '🌐' },
];

const OPCIONES_ESTADO: { label: string; value: EstadoTorneo | '' }[] = [
  { label: '⚡ Todos los estados', value: '' },
  { label: '🟢 Inscripción abierta', value: 'INSCRIPCION_ABIERTA' },
  { label: '🟡 Inscripción cerrada', value: 'INSCRIPCION_CERRADA' },
  { label: '🔵 En curso (En vivo)', value: 'EN_CURSO' },
  { label: '🏁 Finalizado', value: 'FINALIZADO' },
  { label: '🔴 Cancelado', value: 'CANCELADO' },
];

export const TorneoFilters: React.FC<TorneoFiltersProps> = ({
  disciplina,
  estado,
  onDisciplinaChange,
  onEstadoChange,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState(disciplina);

  useEffect(() => {
    setSearchTerm(disciplina);
  }, [disciplina]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== disciplina) {
        onDisciplinaChange(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, disciplina, onDisciplinaChange]);

  const handleChipClick = (query: string) => {
    setSearchTerm(query);
    onDisciplinaChange(query);
  };

  const hayFiltros = Boolean(disciplina || estado);

  return (
    <div className="torneo-figma-filters">
      {/* Search Bar + Notification Bell (Figma Wireframe #37:2) */}
      <div className="torneo-search-row">
        <div className="torneo-search-input-wrap">
          <span className="torneo-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            id="filtro-disciplina"
            type="text"
            className="torneo-search-input"
            placeholder="Buscar por disciplina, sede, club o torneo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="torneo-search-clear"
              onClick={() => {
                setSearchTerm('');
                onDisciplinaChange('');
              }}
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="torneo-notification-bell"
          aria-label="Notificaciones de torneos"
          title="Alertas de nuevos pozos y torneos"
        >
          <span className="bell-icon">🔔</span>
          <span className="bell-dot" aria-hidden="true" />
        </button>
      </div>

      {/* Category Pills & State Dropdown */}
      <div className="torneo-chips-and-status-row">
        <div className="torneo-category-chips">
          {CATEGORIAS_FILTRO.map((cat) => {
            const isSelected =
              (!disciplina && cat.query === '') ||
              (cat.query !== '' && disciplina.toLowerCase() === cat.query.toLowerCase());
            return (
              <button
                key={cat.label}
                type="button"
                className={`torneo-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleChipClick(cat.query)}
              >
                <span className="torneo-chip-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="torneo-status-dropdown-wrap">
          <select
            id="filtro-estado"
            className="torneo-status-select"
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value as EstadoTorneo | '')}
          >
            {OPCIONES_ESTADO.map((op) => (
              <option key={op.value || 'todos'} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {hayFiltros && (
            <button
              type="button"
              className="btn btn-secondary torneo-reset-btn"
              onClick={() => {
                setSearchTerm('');
                onReset();
              }}
              title="Restablecer filtros"
            >
              Limpiar ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
