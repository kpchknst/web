import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import * as authApi from '../api/auth.js';
import { clearToken, getToken, setToken } from './tokenStore.js';

export const AuthContext = createContext({
    user: null,
    loading: true,
    login: async () => {},
    logout: () => {},
    refresh: async () => {},
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!getToken()) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const me = await authApi.fetchMe();
            setUser(me);
        } catch (error) {
            if (error.status === 401) {
                clearToken();
            }
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = useCallback(async (username, password) => {
        const { access_token: accessToken } = await authApi.login(username, password);
        setToken(accessToken);
        const me = await authApi.fetchMe();
        setUser(me);
        return me;
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user, loading, login, logout, refresh,
        }),
        [user, loading, login, logout, refresh],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
