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
  // Input local para debounce
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

  const hayFiltros = Boolean(disciplina || estado);

  return (
    <div className="torneo-filters-bar">
      <div className="torneo-filters-grid">
        {/* Filtro por disciplina */}
        <div className="torneo-filter-field">
          <label htmlFor="filtro-disciplina" className="torneo-filter-label">
            Disciplina
          </label>
          <input
            id="filtro-disciplina"
            type="text"
            className="input"
            placeholder="Buscar por disciplina (ej. Fútbol, Pádel, Ajedrez)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro por estado (Selector sin borrador) */}
        <div className="torneo-filter-field">
          <label htmlFor="filtro-estado" className="torneo-filter-label">
            Estado
          </label>
          <select
            id="filtro-estado"
            className="input select"
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value as EstadoTorneo | '')}
          >
            {OPCIONES_ESTADO.map((op) => (
              <option key={op.value || 'todos'} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón para limpiar filtros */}
        {hayFiltros && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                onReset();
              }}
              style={{ width: '100%', whiteSpace: 'nowrap' }}
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
