import React, { useEffect, useState } from 'react';
import { EstadoTorneo, ModalidadTorneo } from '../types/torneo';
import { IconoBuscar, IconoCampana, IconoCruz } from '../../shared/ui/Iconos';
import './TorneoFilters.css';

interface TorneoFiltersProps {
  q: string;
  modalidad: ModalidadTorneo | '';
  estado: EstadoTorneo | '';
  onQChange: (q: string) => void;
  onModalidadChange: (modalidad: ModalidadTorneo | '') => void;
  onEstadoChange: (estado: EstadoTorneo | '') => void;
  onVerTodos: () => void;
  onReset: () => void;
}

const DISCIPLINAS_FILTRO = ['Fútbol 5', 'Pádel', 'Básquet', 'Esports'];

const MODALIDADES_FILTRO: { label: string; value: ModalidadTorneo }[] = [
  { label: 'Presencial', value: 'PRESENCIAL' },
  { label: 'Online', value: 'ONLINE' },
];

const OPCIONES_ESTADO: { label: string; value: EstadoTorneo | '' }[] = [
  { label: 'Todos los estados', value: '' },
  { label: 'Inscripción abierta', value: 'INSCRIPCION_ABIERTA' },
  { label: 'Inscripción cerrada', value: 'INSCRIPCION_CERRADA' },
  { label: 'En curso (En vivo)', value: 'EN_CURSO' },
  { label: 'Finalizado', value: 'FINALIZADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
];

export const TorneoFilters: React.FC<TorneoFiltersProps> = ({
  q,
  modalidad,
  estado,
  onQChange,
  onModalidadChange,
  onEstadoChange,
  onVerTodos,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState(q);

  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== q) {
        onQChange(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, q, onQChange]);

  const handleDisciplinaClick = (disciplina: string) => {
    setSearchTerm(disciplina);
    onQChange(disciplina);
  };

  const hayFiltros = Boolean(q || modalidad || estado);

  return (
    <div className="torneo-figma-filters">
      {/* Search Bar + Notification Bell (Zero Emojis, Clean Inline SVGs) */}
      <div className="torneo-search-row">
        <div className="torneo-search-input-wrap">
          <span className="torneo-search-icon" aria-hidden="true">
            <IconoBuscar size={18} />
          </span>
          <input
            id="filtro-busqueda"
            type="text"
            className="torneo-search-input"
            placeholder="Buscar por torneo, disciplina o sede..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="torneo-search-clear"
              onClick={() => {
                setSearchTerm('');
                onQChange('');
              }}
              title="Borrar búsqueda"
              aria-label="Borrar búsqueda"
            >
              <IconoCruz size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="torneo-notification-bell"
          aria-label="Notificaciones de torneos"
          title="Alertas de nuevos pozos y torneos"
        >
          <span className="bell-icon">
            <IconoCampana size={18} />
          </span>
          <span className="bell-dot" aria-hidden="true" />
        </button>
      </div>

      {/* Category Pills & State Dropdown */}
      <div className="torneo-chips-and-status-row">
        <div className="torneo-category-chips">
          <button
            type="button"
            className={`torneo-chip ${!q && !modalidad ? 'active' : ''}`}
            onClick={() => {
              setSearchTerm('');
              onVerTodos();
            }}
          >
            <span>Todos</span>
          </button>
          {DISCIPLINAS_FILTRO.map((disciplina) => (
            <button
              key={disciplina}
              type="button"
              className={`torneo-chip ${q.toLowerCase() === disciplina.toLowerCase() ? 'active' : ''}`}
              onClick={() => handleDisciplinaClick(disciplina)}
            >
              <span>{disciplina}</span>
            </button>
          ))}
          {MODALIDADES_FILTRO.map((op) => (
            <button
              key={op.value}
              type="button"
              className={`torneo-chip ${modalidad === op.value ? 'active' : ''}`}
              aria-pressed={modalidad === op.value}
              onClick={() => onModalidadChange(modalidad === op.value ? '' : op.value)}
            >
              <span>{op.label}</span>
            </button>
          ))}
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
              <IconoCruz size={13} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
