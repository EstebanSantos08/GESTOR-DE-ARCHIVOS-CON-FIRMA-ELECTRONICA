import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Layout from './components/layout/Layout';
import Login from './views/Login';
import RecuperarPassword from './views/RecuperarPassword';
import ResetPassword from './views/ResetPassword';

function Root() {
  const { isAutenticado, vistaActual, navParams } = useApp();
  
  if (!isAutenticado) {
    if (vistaActual === 'recuperar') return <RecuperarPassword />;
    if (vistaActual === 'reset') return <ResetPassword initialData={navParams} />;
    return <Login />;
  }
  
  return <Layout />;
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
