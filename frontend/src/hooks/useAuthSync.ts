'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';

export function useAuthSync() {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    async function sync() {
      try {
        const result = await api.syncUser(
          user!.id,
          user!.primaryEmailAddress?.emailAddress || '',
          user!.fullName || user!.firstName || 'Merchant',
        );
        api.setToken(result.token);
        setSynced(true);
        setBusiness(result.user.business);
      } catch (err: any) {
        setError(err.message);
      }
    }

    async function init() {
      const existingToken = api.getToken();
      if (existingToken) {
        try {
          const profile = await api.getProfile();
          setSynced(true);
          setBusiness(profile.business);
        } catch {
          await sync(); // re-sync if token invalid
        }
      } else {
        await sync();
      }
    }

    init();
  }, [isLoaded, user]);

  return { synced, business, error, user };
}
