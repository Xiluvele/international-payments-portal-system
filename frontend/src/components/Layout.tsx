import { Link, useNavigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { User } from '../types';
import { logoutUser } from '../api/auth';

export function Layout({
  children,
  user,
  csrfToken,
  onLogout,
}: PropsWithChildren<{ user: User | null; csrfToken: string; onLogout: () => void }>) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutUser(csrfToken);
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
