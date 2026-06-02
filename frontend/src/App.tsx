import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getCurrentUser } from './api/auth';
import { getCsrfToken } from './api/security';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { LoginPage } from './pages/LoginPage';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getCurrentUser(), getCsrfToken()])
      .then(([userResult, csrfResult]) => {
        if (userResult.status === 'fulfilled') {
          setUser(userResult.value.user);
        }

        if (csrfResult.status === 'fulfilled') {
          setCsrfToken(csrfResult.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading">Loading secure portal...</div>;
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setUser} csrfToken={csrfToken} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              {user?.role === 'admin' ? (
                <AdminDashboard user={user} />
              ) : user?.role === 'employee' ? (
                <EmployeeDashboard user={user} csrfToken={csrfToken} />
              ) : (
                <DashboardPage user={user!} csrfToken={csrfToken} />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
