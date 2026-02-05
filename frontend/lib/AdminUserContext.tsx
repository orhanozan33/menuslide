'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  business_id?: string | null;
  reference_number?: string | null;
  admin_permissions?: Record<string, Record<string, boolean>>;
  [key: string]: unknown;
}

const AdminUserContext = createContext<AdminUser | null>(null);

export function AdminUserProvider({
  user,
  children,
}: {
  user: AdminUser | null;
  children: ReactNode;
}) {
  return (
    <AdminUserContext.Provider value={user}>
      {children}
    </AdminUserContext.Provider>
  );
}

export function useAdminUser() {
  return useContext(AdminUserContext);
}

/** Raporlar sayfası için: layout'taki güncel user'dan reports yetkilerini al (storage'a bağımlı değil) */
export function useReportsPermissions() {
  const user = useAdminUser();
  const role = user?.role ?? null;
  const reportsPerms =
    user?.admin_permissions?.reports && typeof user.admin_permissions.reports === 'object'
      ? user.admin_permissions.reports
      : null;
  const isSuper = role === 'super_admin';
  return {
    role,
    reportsPerms,
    isSuper,
    canViewDashboard: isSuper || reportsPerms?.view_dashboard === true,
    canViewRevenue: isSuper || reportsPerms?.view_revenue === true,
    canViewPayments: isSuper || reportsPerms?.view_payments === true,
    canViewActivity: isSuper || reportsPerms?.view_activity === true,
    canViewMembers: isSuper || reportsPerms?.view_members === true,
  };
}
