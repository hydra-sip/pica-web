import React from 'react';
import './TorneoSkeleton.css';

export const TorneoCardSkeleton: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '30%', height: '22px' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '22px' }} />
      </div>

      <div
        className="skeleton-shimmer skeleton-line"
        style={{ width: '75%', height: '28px', marginTop: '0.5rem' }}
      />
      <div className="skeleton-shimmer skeleton-line" style={{ width: '100%', height: '40px' }} />

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '20px' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '20px' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '20px' }} />
      </div>

      <div
        className="skeleton-shimmer skeleton-line"
        style={{ width: '100%', height: '48px', marginTop: '0.5rem' }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        <div className="skeleton-shimmer skeleton-line" style={{ height: '48px' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ height: '48px' }} />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div className="skeleton-shimmer skeleton-line" style={{ width: '40%', height: '16px' }} />
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '16px' }} />
      </div>
    </div>
  );
};

export const TorneoDetalleSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Breadcrumb skeleton */}
      <div className="skeleton-shimmer skeleton-line" style={{ width: '240px', height: '20px' }} />

      {/* Hero card skeleton */}
      <div className="skeleton-card" style={{ padding: '2.5rem 2rem' }}>
        <div
          className="skeleton-shimmer skeleton-line"
          style={{ width: '140px', height: '24px', marginBottom: '1rem' }}
        />
        <div
          className="skeleton-shimmer skeleton-line"
          style={{ width: '60%', height: '36px', marginBottom: '1rem' }}
        />
        <div
          className="skeleton-shimmer skeleton-line"
          style={{ width: '90%', height: '50px', marginBottom: '1.5rem' }}
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div
            className="skeleton-shimmer skeleton-line"
            style={{ width: '180px', height: '44px' }}
          />
          <div
            className="skeleton-shimmer skeleton-line"
            style={{ width: '150px', height: '44px' }}
          />
        </div>
      </div>

      {/* Grid of detail blocks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div className="skeleton-card" style={{ height: '200px' }} />
        <div className="skeleton-card" style={{ height: '200px' }} />
        <div className="skeleton-card" style={{ height: '200px' }} />
      </div>
    </div>
  );
};
