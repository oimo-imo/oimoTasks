import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import GanttView from './pages/GanttView';
import Review from './pages/ReviewView';
import Login from './pages/Login';
import { StoreProvider } from './lib/store';

import { RequireAuth } from './components/layout/RequireAuth';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectView />} />
              <Route path="gantt" element={<GanttView />} />
              <Route path="review" element={<Review />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
