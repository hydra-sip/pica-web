import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { IncompleteProfileBanner } from '../components/IncompleteProfileBanner';
import './PublicLayout.css';

export const PublicLayout: React.FC = () => {
  return (
    <div className="pica-public-layout hydra-public-layout">
      <IncompleteProfileBanner />
      <Navbar />
      <main className="container pica-public-main hydra-public-main">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};
