import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AvisoSesion } from './auth/components/AvisoSesion';
import { AuthProvider } from './auth/context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import './shared/styles/global.css';
import './shared/ui/ui.css';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AvisoSesion />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
