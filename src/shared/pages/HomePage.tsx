import React, { useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';

interface EventoInscripcion {
  id: number;
  titulo: string;
  categoria: string;
  fecha: string;
  cuposDisponibles: number;
  estado: string;
}

interface RifaItem {
  id: number;
  nombre: string;
  precio: number;
  numerosTotales: number;
  numerosDisponibles: number;
  premio: string;
}

interface BracketEncuentro {
  fase: string;
  jugador1: string;
  score1: number;
  jugador2: string;
  score2: number;
  ganador: string;
}

const MOCK_EVENTOS: EventoInscripcion[] = [
  { id: 1, titulo: 'Torneo Anual de Ajedrez PICA 2026', categoria: 'General / Abierto', fecha: '15 de Octubre, 2026', cuposDisponibles: 12, estado: 'Inscripción Abierta' },
  { id: 2, titulo: 'Olimpiadas de Programación UNLu', categoria: 'Estudiantes', fecha: '01 de Noviembre, 2026', cuposDisponibles: 5, estado: 'Inscripción Abierta' },
];

const MOCK_RIFAS: RifaItem[] = [
  { id: 101, nombre: 'Gran Rifa Anual PICA', precio: 1500, numerosTotales: 100, numerosDisponibles: 34, premio: 'Notebook I7 16GB + Mochila' },
  { id: 102, nombre: 'Rifa Relámpago Tecnología', precio: 800, numerosTotales: 50, numerosDisponibles: 18, premio: 'Tablet 10" + Auriculares Inalámbricos' },
];

const MOCK_BRACKET: BracketEncuentro[] = [
  { fase: 'Semifinal 1', jugador1: 'Lucas Martínez', score1: 2, jugador2: 'Federico Fernández', score2: 1, ganador: 'Lucas Martínez' },
  { fase: 'Semifinal 2', jugador1: 'María Elena Rodríguez', score1: 3, jugador2: 'Carlos Gómez', score2: 0, ganador: 'María Elena Rodríguez' },
  { fase: 'Gran Final', jugador1: 'Lucas Martínez', score1: 2, jugador2: 'María Elena Rodríguez', score2: 3, ganador: 'María Elena Rodríguez' },
];

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  // Interactive tab selection for mobile viewing
  const [activeTab, setActiveTab] = useState<'inscripciones' | 'rifas' | 'resultados'>('inscripciones');
  const [inscripcionSuccess, setInscripcionSuccess] = useState<string | null>(null);
  const [comprarRifaSuccess, setComprarRifaSuccess] = useState<string | null>(null);

  const handleInscribirse = (eventoTitle: string) => {
    setInscripcionSuccess(`¡Te inscribiste exitosamente a: "${eventoTitle}"!`);
    setTimeout(() => setInscripcionSuccess(null), 3000);
  };

  const handleComprarRifa = (rifaNombre: string) => {
    setComprarRifaSuccess(`¡Iniciaste la compra de número para la rifa: "${rifaNombre}"!`);
    setTimeout(() => setComprarRifaSuccess(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '100%' }}>
      {/* Hero Header para Móviles y Escritorio */}
      <section className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--accent-gradient)' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'inline-block',
            marginBottom: '0.5rem',
          }}
        >
          Vista Pública & Participant Portal Mobile
        </span>

        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', color: '#fff', margin: '0.25rem 0' }}>
          Portal de Inscripción y Resultados PICA
        </h1>

        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
          {user ? `¡Hola ${user.name}!` : 'Bienvenido.'} Inscribite a eventos, comprá rifas y consultá la grilla de resultados en vivo.
        </p>
      </section>

      {/* Tabs de Navegación Responsive para Smartphone */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-md)',
          padding: '0.35rem',
          border: '1px solid var(--border-color)',
          gap: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('inscripciones')}
          style={{
            flex: 1,
            padding: '0.65rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'inscripciones' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'inscripciones' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          📝 Inscripciones
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rifas')}
          style={{
            flex: 1,
            padding: '0.65rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'rifas' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'rifas' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          🎟️ Rifas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resultados')}
          style={{
            flex: 1,
            padding: '0.65rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'resultados' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'resultados' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          🏆 Resultados (Bracket)
        </button>
      </div>

      {/* SECCIÓN 1: INSCRIPCIONES (Responsive Mobile Cards) */}
      {activeTab === 'inscripciones' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Eventos y Torneos Disponibles</h3>

          {inscripcionSuccess && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.875rem',
              }}
            >
              {inscripcionSuccess}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {MOCK_EVENTOS.map((ev) => (
              <div key={ev.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <span className="badge" style={{ fontSize: '0.7rem' }}>{ev.categoria}</span>
                  <h4 style={{ fontSize: '1.1rem', marginTop: '0.4rem', color: 'var(--text-primary)' }}>{ev.titulo}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    📅 {ev.fecha} | 👥 {ev.cuposDisponibles} cupos restantes
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleInscribirse(ev.titulo)}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
                >
                  Inscribirme Ahora
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: RIFAS (Responsive Mobile Grid) */}
      {activeTab === 'rifas' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Rifas y Sorteos Activos</h3>

          {comprarRifaSuccess && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-secondary)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                fontSize: '0.875rem',
              }}
            >
              {comprarRifaSuccess}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {MOCK_RIFAS.map((rifa) => (
              <div key={rifa.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    Premio: {rifa.premio}
                  </span>
                  <h4 style={{ fontSize: '1.1rem', marginTop: '0.4rem', color: 'var(--text-primary)' }}>{rifa.nombre}</h4>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>
                    ${rifa.precio} ARS / número
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Quedan {rifa.numerosDisponibles} de {rifa.numerosTotales} números disponibles
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleComprarRifa(rifa.nombre)}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
                >
                  🎟️ Comprar Número
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 3: GRILLA DE RESULTADOS / BRACKET RESPONSIVE PARA CELULARES */}
      {activeTab === 'resultados' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Grilla de Resultados y Bracket del Torneo</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Diagrama adaptado para dispositivos móviles (desplazable en celulares).
          </p>

          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {MOCK_BRACKET.map((bkt, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    {bkt.fase}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: bkt.ganador === bkt.jugador1 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: bkt.ganador === bkt.jugador1 ? '#10b981' : 'var(--text-primary)',
                        fontWeight: bkt.ganador === bkt.jugador1 ? 700 : 400,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span>{bkt.jugador1}</span>
                      <span>{bkt.score1}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: bkt.ganador === bkt.jugador2 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: bkt.ganador === bkt.jugador2 ? '#10b981' : 'var(--text-primary)',
                        fontWeight: bkt.ganador === bkt.jugador2 ? 700 : 400,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span>{bkt.jugador2}</span>
                      <span>{bkt.score2}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
