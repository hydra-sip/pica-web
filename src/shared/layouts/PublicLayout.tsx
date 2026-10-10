import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { IncompleteProfileBanner } from '../components/IncompleteProfileBanner';

export const PublicLayout: React.FC = () => {
  return (
    <>
      <IncompleteProfileBanner />
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '2rem 1rem' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};
