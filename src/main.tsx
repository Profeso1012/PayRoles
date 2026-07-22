import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { USE_REAL_API } from '@/lib/api/adapter';
import App from './App';
import './index.css';

async function enableMocking() {
  // Never intercept with MSW when pointed at the real backend, regardless of
  // VITE_APP_ENV — otherwise every request silently gets mocked or 404s.
  if (USE_REAL_API) return;
  if (import.meta.env.VITE_APP_ENV !== 'development') return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
