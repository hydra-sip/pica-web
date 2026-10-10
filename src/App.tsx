import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import './shared/styles/global.css';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
