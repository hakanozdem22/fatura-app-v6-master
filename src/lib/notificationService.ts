import { supabase } from './supabaseClient';

// Helper function to force UI updates immediately, bypassing websocket lag
const triggerLocalUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications_updated'));
    }
};

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    is_read: boolean;
    source_id?: string;
    created_at: string;
}

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
};

export const getUnreadCount = async (userId: string): Promise<{ count: number }> => {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error fetching unread count:', error);
        return { count: 0 };
    }

    return { count: count || 0 };
};

export const markAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
    } else {
        triggerLocalUpdate();
    }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error marking all notifications as read:', error);
    } else {
        triggerLocalUpdate();
    }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

    if (error) {
        console.error('Error deleting notification:', error);
    } else {
        triggerLocalUpdate();
    }
};

export const deleteAllNotifications = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting all notifications:', error);
    } else {
        triggerLocalUpdate();
    }
};

interface SendNotificationParams {
    user_id: string;
    title: string;
    message: string;
    source_id?: string;
}

export const sendNotification = async (params: SendNotificationParams): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .insert([
            {
                user_id: params.user_id,
                title: params.title,
                message: params.message,
                source_id: params.source_id,
                is_read: false
            }
        ]);

    if (error) {
        console.error('Error sending notification:', error);
    } else {
        triggerLocalUpdate();
    }
};

interface SendNotificationToRoleParams {
    role: string;
    title: string;
    message: string;
    source_id?: string;
}

export const sendNotificationToRole = async (params: SendNotificationToRoleParams): Promise<void> => {
    try {
        // Fetch all active users with the specified role
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('role', params.role)
            .eq('status', 'active');

        if (userError) {
            console.error(`Error fetching users for role ${params.role}:`, userError);
            return;
        }

        if (!users || users.length === 0) {
            console.warn(`No active users found for role: ${params.role}`);
            return;
        }

        // Prepare notifications for all users
        const notifications = users.map(user => ({
            user_id: user.id,
            title: params.title,
            message: params.message,
            source_id: params.source_id,
            is_read: false
        }));

        const { error } = await supabase
            .from('notifications')
            .insert(notifications);

        if (error) {
            console.error(`Error sending notifications to role ${params.role}:`, error);
        } else {
            triggerLocalUpdate();
        }
    } catch (err) {
        console.error('Unexpected error in sendNotificationToRole:', err);
    }
};
