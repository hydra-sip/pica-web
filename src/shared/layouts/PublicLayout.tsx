import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PublicLayout: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="container" style={{ flex: 1, padding: '2rem 1rem' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};
