import React from 'react';
import { PremioDetalle } from '../types/torneo';
import { pesos } from '../../shared/formato';
import { IconoMedalla, IconoTrofeo } from '../../shared/ui/Iconos';

interface TorneoPremiosListProps {
  premios: PremioDetalle[];
  /** Pozo neto a repartir en premios (inscripciones menos gastos previstos), como lo calcula el back. */
  pozoEstimado: number;
  moneda?: string;
}

const getMedalColor = (puesto: number): { bg: string; color: string; border: string } => {
  switch (puesto) {
    case 1:
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 2:
      return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    case 3:
      return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    default:
      return { bg: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' };
  }
};

export const TorneoPremiosList: React.FC<TorneoPremiosListProps> = ({
  premios,
  pozoEstimado,
}) => {
  // Ordenar puestos ascendente (1, 2, 3...)
  const premiosOrdenados = [...premios].sort((a, b) => a.puesto - b.puesto);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Resumen del pozo y partición */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-3)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Pozo neto para competidores (inscripciones menos gastos)
          </div>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
              color: 'var(--color-text)',
              marginTop: '0.25rem',
            }}
          >
            {pesos(pozoEstimado)}
          </div>
        </div>

      </div>

      {/* Lista de puestos y premios */}
      {premiosOrdenados.length === 0 ? (
        <div
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            fontStyle: 'italic',
          }}
        >
          La distribución de premios no ha sido detallada por el organizador.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {premiosOrdenados.map((premio) => {
            const estilo = getMedalColor(premio.puesto);
            const montoEstimado =
              premio.monto != null ? premio.monto : (pozoEstimado * premio.pct) / 100;

            return (
              <div
                key={premio.puesto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: estilo.bg,
                      color: estilo.color,
                      border: `1px solid ${estilo.border}`,
                    }}
                  >
                    {premio.puesto === 1 ? (
                      <IconoTrofeo size={18} />
                    ) : (
                      <IconoMedalla size={18} />
                    )}
                  </span>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {premio.puesto}° Puesto
                    </div>
                    <div
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}
                    >
                      {premio.pct}% del pozo neto
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      fontSize: 'var(--text-md)',
                    }}
                  >
                    {pesos(montoEstimado)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    estimado
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
