import React from 'react';
import { PremioDetalle } from '../types/torneo';
import { pesos } from '../../shared/formato';
import { calcularPremioPuesto } from '../utils/formatters';
import { IconoTrofeo, IconoBilletera, IconoEscudo, IconoMedalla } from '../../shared/ui/Iconos';

interface TorneoPremiosListProps {
  premios: PremioDetalle[];
  pozoEstimado: number;
  pctPozoCompetidores: number;
  pctPremioRifa: number;
  moneda: string;
}

const getPodiumConfig = (puesto: number) => {
  switch (puesto) {
    case 1:
      return {
        badge: 'Campeón',
        tag: '1° Puesto',
        cardClass: 'podium-card-gold',
        border: 'var(--color-gold-border)',
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.16) 100%)',
        amountColor: '#78350f',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
        badgeColor: '#b45309',
      };
    case 2:
      return {
        badge: 'Subcampeón',
        tag: '2° Puesto',
        cardClass: 'podium-card-silver',
        border: '#cbd5e1',
        bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        amountColor: '#1e293b',
        badgeBg: 'rgba(100, 116, 139, 0.15)',
        badgeColor: '#334155',
      };
    case 3:
      return {
        badge: '3° Puesto',
        tag: '3° Puesto',
        cardClass: 'podium-card-bronze',
        border: '#fed7aa',
        bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(254, 215, 170, 0.14) 100%)',
        amountColor: '#7c2d12',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeColor: '#c2410c',
      };
    default:
      return {
        badge: `${puesto}° Puesto`,
        tag: `${puesto}° Puesto`,
        cardClass: 'podium-card-default',
        border: 'var(--border-color)',
        bg: 'var(--bg-surface)',
        amountColor: 'var(--text-primary)',
        badgeBg: 'var(--bg-subtle)',
        badgeColor: 'var(--text-secondary)',
      };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Resumen del pozo y partición */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: pctPremioRifa > 0 ? '1fr 1fr' : '1fr',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.12) 100%)',
            border: '1px solid var(--color-emerald-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-emerald-dark)',
              textTransform: 'uppercase',
              fontWeight: 800,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <IconoTrofeo size={15} />
            <span>Pozo Competidores ({pctPozoCompetidores}%)</span>
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
              marginTop: '0.25rem',
              letterSpacing: '-0.02em',
            }}
          >
            {pesos(montoCompetidores)}
          </div>
        </div>

        {pctPremioRifa > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(67, 56, 202, 0.12) 100%)',
              border: '1px solid var(--color-indigo-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(99, 102, 241, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-indigo-dark)',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <IconoBilletera size={15} />
              <span>Pozo Rifa Espectadores ({pctPremioRifa}%)</span>
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--text-primary)',
                marginTop: '0.25rem',
                letterSpacing: '-0.02em',
              }}
            >
              {pesos(montoRifa)}
            </div>
          </div>
        )}
      </div>

      {/* Lista de puestos y premios (Podio sin emojis) */}
      {premiosOrdenados.length === 0 ? (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            fontStyle: 'italic',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          La distribución de premios por puesto no ha sido detallada por el organizador.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {premiosOrdenados.map((premio) => {
            const montoEstimado = calcularPremioPuesto(
              pozoEstimado,
              pctPozoCompetidores,
              premio.pct
            );
            const podium = getPodiumConfig(premio.puesto);

            return (
              <div
                key={premio.puesto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: podium.bg,
                  border: `1px solid ${podium.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.15rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: podium.badgeBg,
                      color: podium.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      letterSpacing: '-0.02em',
                      flexShrink: 0,
                    }}
                  >
                    {premio.puesto === 1 ? <IconoTrofeo size={18} /> : <IconoMedalla size={18} />}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <span>{podium.badge}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {premio.pct}% del pozo
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.15rem',
                      }}
                    >
                      Puesto {premio.puesto} oficial
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 900,
                      color: podium.amountColor,
                      fontSize: '1.25rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {pesos(montoEstimado)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    Premio en Custodia
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escrow Guarantee Footer Note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.65rem 0.95rem',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.76rem',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <IconoEscudo size={16} />
        <span>
          <strong>Garantía PICA Escrow:</strong> Los premios se liquidan automáticamente a las billeteras de los ganadores tras la homologación del acta arbitral.
        </span>
      </div>
    </div>
  );
};
