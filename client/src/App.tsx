import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Developers from './pages/Developers';
import DeveloperDetail from './pages/DeveloperDetail';
import Requests from './pages/Requests';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="people" element={<Developers />} />
          <Route path="people/:id" element={<DeveloperDetail />} />
          <Route path="requests" element={<Requests />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
