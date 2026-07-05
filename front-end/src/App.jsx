import React from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}
