import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { ConfirmProvider } from './context/ConfirmContext';

function App() {
  return (
    <ConfirmProvider>
      <div className="app-root">
        <AppRoutes />
      </div>
    </ConfirmProvider>
  );
}

export default App;
// Updated Students module

