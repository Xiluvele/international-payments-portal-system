import { Navigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { User } from '../types';

export function ProtectedRoute({ user, children }: PropsWithChildren<{ user: User | null }>) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
