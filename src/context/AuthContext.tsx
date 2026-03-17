import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { logAction } from '../lib/logger';
import type { UserProfile } from '../types/auth';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (error) {
                console.error('Error fetching user profile:', error.message);
                setProfile(null);
            } else if (userData) {
                // Auth metadata ve DB verilerini akıllıca birleştir
                // Her zaman en güncel veriye ulaşmak için metadata öncelikli olsun ama null değilse
                const metadata = authUser?.user_metadata || {};

                const mergedProfile = {
                    ...userData,
                    avatar_url: metadata.avatar_url || userData.avatar_url,
                    approval_stamp_url: metadata.approval_stamp_url || userData.approval_stamp_url,
                    rejection_stamp_url: metadata.rejection_stamp_url || userData.rejection_stamp_url
                };
                setProfile(mergedProfile as UserProfile);
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
            setProfile(null);
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id).finally(() => setLoading(false));
                } else {
                    setLoading(false);
                }
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                setLoading(true);
                fetchProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await logAction(user?.email, 'Sistemden Çıkış', 'Kullanıcı oturumu kapattı');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
