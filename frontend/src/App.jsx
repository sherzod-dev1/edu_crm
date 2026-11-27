import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { ConfirmProvider } from './context/ConfirmContext';
import { GlobalLoadingBar } from './components';

function App() {
  return (
    <ConfirmProvider>
      <div className="app-root">
        <GlobalLoadingBar />
        <AppRoutes />
      </div>
    </ConfirmProvider>
  );
}

export default App;
// Updated Students module

