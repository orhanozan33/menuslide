'use client';

import { useState, useEffect } from 'react';

/**
 * Admin sayfa yetkileri: storage'daki user.admin_permissions[pageKey] ile eşleşir.
 * Süper admin her zaman tüm yetkilere sahip.
 */
export function useAdminPagePermissions(pageKey: string) {
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_user') || localStorage.getItem('user')) : null;
      if (!raw) return;
      const u = JSON.parse(raw);
      setRole(u?.role ?? null);
      const pagePerms = u?.admin_permissions?.[pageKey];
      setPerms(pagePerms && typeof pagePerms === 'object' ? pagePerms : {});
    } catch {
      setPerms({});
      setRole(null);
    }
  }, [pageKey]);

  const isSuper = role === 'super_admin';
  const can = (action: string) => isSuper || perms[action] === true;
  const hasView = isSuper || perms.view === true;

  return { perms, role, isSuper, can, hasView };
}
