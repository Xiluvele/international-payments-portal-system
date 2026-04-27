import { Link, useNavigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { User } from '../types';
import { logoutUser } from '../api/auth';

export function Layout({ children, user, onLogout }: PropsWithChildren<{ user: User | null; onLogout: () => void }>) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutUser();
    onLogout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Secure International Payments Portal</h1>
        </div>
        <nav>
          <Link to="/">Dashboard</Link>
          {!user && <Link to="/register">Register</Link>}
          {!user && <Link to="/login">Login</Link>}
          {user && <button onClick={handleLogout}>Logout</button>}
        </nav>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
