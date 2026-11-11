import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import App from './App';
import { installStaleBuildReload } from '@/lib/reloadOnStaleBuild';
import './index.css';

// Tabs open during a deploy would otherwise crash on the next page they open.
installStaleBuildReload();

// MSW is no longer used - we only connect to real backend API
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
