import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isUser = user?.role === 'user';
  
  return { 
    isAdmin, 
    isSuperAdmin, 
    isUser,
    role: user?.role 
  };
}

