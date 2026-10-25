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

const CATEGORIAS_FIGMA = ['Todos', 'Fútbol 5', 'Pádel', 'Presencial', 'Online'];

const OPCIONES_ESTADO: { label: string; value: EstadoTorneo | '' }[] = [
  { label: 'Todos los estados', value: '' },
  { label: 'Inscripción abierta', value: 'INSCRIPCION_ABIERTA' },
  { label: 'Inscripción cerrada', value: 'INSCRIPCION_CERRADA' },
  { label: 'En curso', value: 'EN_CURSO' },
  { label: 'Finalizado', value: 'FINALIZADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
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

  const handleChipClick = (cat: string) => {
    if (cat === 'Todos') {
      setSearchTerm('');
      onDisciplinaChange('');
    } else {
      setSearchTerm(cat);
      onDisciplinaChange(cat);
    }
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
            placeholder="Buscar torneos, clubes o disciplinas..."
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
          aria-label="Notificaciones"
          title="Notificaciones de torneos"
        >
          🔔
        </button>
      </div>

      {/* Category Pills (Figma Wireframe #37:2) & State Filter */}
      <div className="torneo-chips-and-status-row">
        <div className="torneo-category-chips">
          {CATEGORIAS_FIGMA.map((cat) => {
            const isSelected =
              (cat === 'Todos' && !disciplina) ||
              disciplina.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                className={`torneo-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleChipClick(cat)}
              >
                {cat}
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
            >
              Limpiar ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
