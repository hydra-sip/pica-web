import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface ApiInfo {
  name: string;
  version: string;
  status: string;
  environment: string;
  message: string;
}

export const HomePage: React.FC = () => {
  const [info, setInfo] = useState<ApiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetch(`${apiUrl}/info`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al conectar con la API');
        return res.json();
      })
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3rem 1rem 1rem 1rem' }}>
        <span className="badge" style={{ marginBottom: '1rem' }}>
          Plataforma Web Base
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem' }}>
          Bienvenido a <span className="gradient-text">PICA Web</span>
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.15rem',
            maxWidth: '650px',
            margin: '0 auto 2rem auto',
          }}
        >
          Sistema de gestión integral para la administración y control del proyecto PICA (SIP - UNLu).
        </p>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/auth/login" className="btn btn-primary">
            Acceder al Sistema
          </Link>
          <Link to="/admin" className="btn btn-secondary">
            Panel de Control
          </Link>
        </div>
      </section>

      {/* API Contract Status Section (MSW Check) */}
      <section className="glass-card">
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: loading ? '#f59e0b' : error ? '#ef4444' : '#10b981',
              display: 'inline-block',
            }}
          />
          Estado de Contrato de API (MSW Mock)
        </h3>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Cargando datos del contrato de API...</p>}
        {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}
        {info && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            }}
          >
            <div><strong>Servicio:</strong> {info.name}</div>
            <div><strong>Versión:</strong> {info.version}</div>
            <div><strong>Estado:</strong> <span style={{ color: '#10b981' }}>{info.status}</span></div>
            <div><strong>Ambiente:</strong> {info.environment}</div>
            <div><strong>VITE_API_URL:</strong> {apiUrl}</div>
            <div style={{ marginTop: '0.5rem', color: 'var(--accent-secondary)' }}>{info.message}</div>
          </div>
        )}
      </section>

      {/* Feature Architecture Overview */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div className="glass-card">
          <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem' }}>
            📁 Módulo Auth
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Autenticación, registro, gestión de credenciales y tokens JWT de sesión.
          </p>
        </div>

        <div className="glass-card">
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
            📁 Módulo Admin
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Panel de control administrativo con métricas, estadísticas y gestión de usuarios.
          </p>
        </div>

        <div className="glass-card">
          <h4 style={{ color: '#10b981', marginBottom: '0.5rem' }}>
            📁 Módulo Shared
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Layouts públicos mobile-first (RF-007), componentes reutilizables y estilos globales.
          </p>
        </div>
      </section>
    </div>
  );
};
