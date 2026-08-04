import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Layout from './components/layout/Layout';
import Login from './views/Login';
import RecuperarPassword from './views/RecuperarPassword';
import ResetPassword from './views/ResetPassword';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error no capturado en la aplicación:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('gestdoc_token');
    localStorage.removeItem('gestdoc_usuario');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 border border-gray-100">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-navy-900">Se produjo un error de renderizado</h2>
            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 text-left font-mono overflow-auto max-h-24">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-navy-900 text-white font-medium rounded-lg text-sm hover:bg-navy-800 transition-colors shadow-sm"
              >
                Reiniciar Sesión
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <AppProvider>
        <Root />
      </AppProvider>
    </ErrorBoundary>
  );
}
