import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Layout from './components/layout/Layout';
import Login from './views/Login';

function Root() {
  const { isAutenticado } = useApp();
  return isAutenticado ? <Layout /> : <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
