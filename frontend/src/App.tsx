import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import ChunksPage from './pages/ChunksPage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import StatusPage from './pages/StatusPage';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
