import React, { useEffect, useState } from 'react';

interface AdminStats {
  totalUsers: number;
  activeProjects: number;
  systemStatus: string;
  lastBackup: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetch(`${apiUrl}/admin/stats`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [apiUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <span className="badge">Módulo Administración</span>
        <h1 style={{ marginTop: '0.5rem' }}>Panel de Control PICA</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Resumen operativo del sistema y métricas globales.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="glass-card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Usuarios Registrados</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--accent-secondary)', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.totalUsers}
          </h2>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Proyectos Activos</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.activeProjects}
          </h2>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estado del Sistema</span>
          <h2 style={{ fontSize: '2.2rem', color: '#10b981', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.systemStatus}
          </h2>
        </div>
      </div>

      <div className="glass-card">
        <h3>Actividad Reciente y Respaldos</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Última copia de seguridad procesada por MSW Mock Server: {' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleString() : 'Cargando...'}
          </strong>
        </p>
      </div>
    </div>
  );
};
