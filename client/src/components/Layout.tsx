import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">CF247 Metis</span>
        <div className="nav-links">
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/developers">People</NavLink>
          <NavLink to="/requests">Requests</NavLink>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
