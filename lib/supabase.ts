import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase 설정
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey, 'Length:', supabaseAnonKey?.length);

// 웹용 localStorage 스토리지 (SSR 안전)
const webStorage = {
    getItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
        return Promise.resolve(null);
    },
    setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
    },
    removeItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
        return Promise.resolve();
    },
};

// 플랫폼에 따른 스토리지 선택
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// Supabase 클라이언트 생성
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    global: {
        headers: {
            'X-Client-Info': 'onanbu-app',
            'apikey': supabaseAnonKey,
        },
    },
});

// Auth 헬퍼 함수들
export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
};

export const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
};

export default supabase;
