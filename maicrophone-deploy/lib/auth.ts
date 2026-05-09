export interface UserSession {
    userId: string;
    username: string;
}

export function getUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
        return JSON.parse(stored) as UserSession;
    } catch {
        return null;
    }
}

export function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login';
}
