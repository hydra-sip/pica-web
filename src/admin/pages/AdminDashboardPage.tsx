import React, { useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient';

interface AdminStats {
  totalUsers: number;
  activeProjects: number;
  systemStatus: string;
  lastBackup: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient
      .get<AdminStats>('/admin/stats')
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar métricas:', err);
        setError(err.message || 'Error de conexión');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <span className="badge">Módulo Administración</span>
        <h1 style={{ marginTop: '0.5rem' }}>Panel de Control PICA</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Resumen operativo del sistema y métricas globales.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

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
          Última copia de seguridad procesada por MSW Mock Server:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleString() : 'Cargando...'}
          </strong>
        </p>
      </div>
    </div>
  );
};
