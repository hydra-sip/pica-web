import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function enableMocking() {
  const enableMocks = import.meta.env.VITE_ENABLE_MOCKS !== 'false';
  if (import.meta.env.DEV && enableMocks) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
