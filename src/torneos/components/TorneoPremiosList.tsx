import React from 'react';
import { PremioDetalle } from '../types/torneo';
import { pesos } from '../../shared/formato';
import { calcularPremioPuesto } from '../utils/formatters';

interface TorneoPremiosListProps {
  premios: PremioDetalle[];
  pozoEstimado: number;
  pctPozoCompetidores: number;
  pctPremioRifa: number;
  moneda: string;
}

const getMedalIcon = (puesto: number): string => {
  switch (puesto) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '🎖️';
  }
};

export const TorneoPremiosList: React.FC<TorneoPremiosListProps> = ({
  premios,
  pozoEstimado,
  pctPozoCompetidores,
  pctPremioRifa,
}) => {
  const montoCompetidores = (pozoEstimado * pctPozoCompetidores) / 100;
  const montoRifa = (pozoEstimado * pctPremioRifa) / 100;

  // Ordenar puestos ascendente (1, 2, 3...)
  const premiosOrdenados = [...premios].sort((a, b) => a.puesto - b.puesto);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Resumen del pozo y partición */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: pctPremioRifa > 0 ? '1fr 1fr' : '1fr',
          gap: 'var(--space-3)',
        }}
      >
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
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Pozo para Competidores ({pctPozoCompetidores}%)
          </div>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginTop: '0.2rem',
            }}
          >
            {pesos(montoCompetidores)}
          </div>
        </div>

        {pctPremioRifa > 0 && (
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
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Premio Rifa / Espectadores ({pctPremioRifa}%)
            </div>
            <div
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginTop: '0.2rem',
              }}
            >
              {pesos(montoRifa)}
            </div>
          </div>
        )}
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
            const montoEstimado = calcularPremioPuesto(
              pozoEstimado,
              pctPozoCompetidores,
              premio.pct
            );

            return (
              <div
                key={premio.puesto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.35rem' }}>{getMedalIcon(premio.puesto)}</span>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {premio.puesto}° Puesto
                    </div>
                    <div
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}
                    >
                      {premio.pct}% del pozo de competidores
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 700,
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
