export type UserRole = 'admin' | 'manager' | 'yonetici' | 'user' | 'fatura sorumlusu' | 'fatura_sorumlusu' | 'muhasebe' | 'irsaliye' | 'satinalma' | 'fatura_irsaliye';
export type UserStatus = 'pending_approval' | 'active' | 'rejected' | 'deleted';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: UserStatus;
    stamp_url?: string;
    approval_stamp_url?: string;
    rejection_stamp_url?: string;
    avatar_url?: string;
}
