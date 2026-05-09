'use client';

import { getUser, type UserSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Hook that ensures the user is logged in.
 * Redirects to /login if no session found.
 */
export function useAuth() {
    const [user, setUser] = useState<UserSession | null>(null);
    const router = useRouter();

    useEffect(() => {
        const session = getUser();
        if (!session) {
            router.replace('/login');
        } else {
            setUser(session);
        }
    }, [router]);

    return user;
}
