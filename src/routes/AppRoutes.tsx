import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../shared/layouts/PublicLayout';
import { HomePage } from '../shared/pages/HomePage';
import { LoginPage } from '../auth/pages/LoginPage';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { NotFoundPage } from '../shared/pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/register" element={<RegisterPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
