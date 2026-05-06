import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';
import ChatPage from './pages/ChatPage';
import ChunksPage from './pages/ChunksPage';
import DocumentsPage from './pages/DocumentsPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import StatusPage from './pages/StatusPage';

const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (AUTH_ENABLED && loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#888',
      }}>
        Loading…
      </div>
    );
  }

  if (AUTH_ENABLED && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/documents" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="chunks" element={<ChunksPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
