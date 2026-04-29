import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
// @ts-ignore
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
    return data;
}
interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getAuthRedirectUrl() {
    const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();

    if (configuredUrl) {
        return configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
    }

    return `${window.location.origin}/`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        if (!user) {
            setProfile(null);
            return;
        }

        const profileData = await getProfile(user.id);
        setProfile(profileData);
    };

    useEffect(() => {
        supabase
            .auth
            .getSession()
            // @ts-ignore
            .then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    getProfile(session.user.id).then(setProfile);
                }
            })
            // @ts-ignore
            .catch(error => {
                toast.error(`获取用户信息失败: ${error.message}`);
            })
            .finally(() => {
                setLoading(false);
            });

        // @ts-ignore
        // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                getProfile(session.user.id).then(setProfile);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                   redirectTo: getAuthRedirectUrl(),
                }
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
