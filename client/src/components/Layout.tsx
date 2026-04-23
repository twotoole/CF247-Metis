import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">CF247 Metis</div>
        <nav className="sidebar-nav">
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/people">People</NavLink>
          <NavLink to="/actions">Actions</NavLink>
          <NavLink to="/requests">Requests</NavLink>
          <NavLink to="/notes">Notes</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
