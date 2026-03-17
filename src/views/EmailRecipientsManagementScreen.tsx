import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, UserRole } from '../types/auth';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { logAction } from '../lib/logger';

export default function EmailRecipientsManagementScreen() {
    const { profile, user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tüm Roller');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, userName: string }>({ isOpen: false, id: '', userName: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [adminWarning, setAdminWarning] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('users').select('*').order('full_name', { ascending: true });
        if (error) {
            console.error('Error fetching users:', error);
        } else {
            console.log('Fetched users list:', data);
            // Hide soft-deleted users
            const activeUsers = (data as UserProfile[]).filter(u => u.status !== 'deleted');
            setUsers(activeUsers);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusChange = async (userId: string, newStatus: string) => {
        const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
        if (error) {
            console.error('Error updating status:', error);
            alert('Durum güncellenirken bir hata oluştu.');
        } else {
            const targetUser = users.find(u => u.id === userId);
            await logAction(
                user?.email,
                'Kullanıcı Durumu Güncelleme',
                `${targetUser?.full_name || 'Bilinmeyen'} adlı kullanıcının durumu '${newStatus}' olarak değiştirildi.`
            );
            fetchUsers();
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        // Admin sadece bir kişi olabilir
        if (newRole === 'admin') {
            const existingAdmin = users.find(u => u.role === 'admin' && u.id !== userId);
            if (existingAdmin) {
                setAdminWarning(`Sistemde zaten bir admin var: ${existingAdmin.full_name}. Sadece bir admin olabilir.`);
                setTimeout(() => setAdminWarning(''), 5000);
                return;
            }
        }

        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
        if (error) {
            console.error('Error updating role:', error);
            setAdminWarning('Rol güncellenirken bir hata oluştu.');
            setTimeout(() => setAdminWarning(''), 5000);
        } else {
            const targetUser = users.find(u => u.id === userId);
            await logAction(
                user?.email,
                'Kullanıcı Yetkisi Güncelleme',
                `${targetUser?.full_name || 'Bilinmeyen'} adlı kullanıcının rolü '${newRole}' olarak değiştirildi.`
            );
            fetchUsers();
        }
    };

    const handleDeleteClick = (id: string, userName: string) => {
        setDeleteModal({ isOpen: true, id, userName });
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('users').update({ status: 'deleted' }).eq('id', deleteModal.id);
            if (error) {
                console.error('Kullanıcı silme hatası:', error);
                alert('Silme işlemi sırasında hata oluştu.');
            } else {
                setUsers(prev => prev.filter(u => u.id !== deleteModal.id));

                await logAction(
                    user?.email,
                    'Kullanıcı Silme',
                    `${deleteModal.userName} adlı kullanıcı sistemden gizlendi (Soft Delete).`
                );
            }
        } catch (err) {
            console.error('Beklenmeyen hata:', err);
        } finally {
            setIsDeleting(false);
            setDeleteModal({ isOpen: false, id: '', userName: '' });
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const filteredUsers = users.filter(user => {
        if (user.status === 'deleted') return false;

        const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'Tüm Roller' ||
            (roleFilter === 'Müdür' && user.role === 'manager') ||
            (roleFilter === 'Admin' && user.role === 'admin') ||
            (roleFilter === 'Muhasebe' && user.role === 'muhasebe') ||
            (roleFilter === 'Satın Alma' && user.role === 'satinalma') ||
            (roleFilter === 'Fatura Sorumlusu' && user.role === 'user') ||
            (roleFilter === 'Yönetici' && user.role === 'yonetici') ||
            (roleFilter === 'Fatura / İrsaliye Sorumlusu' && user.role === 'fatura_irsaliye');
        return matchesSearch && matchesRole;
    });

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-8">
            <header className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Kullanıcı Yönetimi</h2>
                <p className="text-slate-500 dark:text-slate-400">Sistemdeki kullanıcıları yönetin ve onaylayın.</p>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400">search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="İsim veya e-posta ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filtre:</span>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-lg transition-colors"
                        >
                            <option>Tüm Roller</option>
                            <option>Admin</option>
                            <option>Müdür</option>
                            <option>Fatura Sorumlusu</option>
                            <option>İrsaliye Sorumlusu</option>
                            <option>Fatura / İrsaliye Sorumlusu</option>
                            <option>Muhasebe</option>
                            <option>Satın Alma</option>
                            <option>Yönetici</option>
                        </select>
                    </div>
                    <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20" title="Yenile">
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                </div>
            </div>

            {/* Admin uyarı mesajı */}
            {adminWarning && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                    <span className="text-sm font-medium">{adminWarning}</span>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div className="min-w-[800px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[25%]">İsim</th>
                                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[30%]">E-posta</th>
                                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">Rol</th>
                                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">Durum</th>
                                <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Kullanıcı bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mr-3 border border-primary/20 overflow-hidden shrink-0">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getInitials(user.full_name || 'U')
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{user.full_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 font-medium truncate">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={user.id === profile?.id}
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                                className="pl-3 pr-8 py-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary rounded-lg text-xs"
                                            >
                                                <option value="user">Fatura Sorumlusu</option>
                                                <option value="irsaliye">İrsaliye Sorumlusu</option>
                                                <option value="fatura_irsaliye">Fatura / İrsaliye Sorumlusu</option>
                                                <option value="manager">Müdür</option>
                                                <option value="yonetici">Yönetici</option>
                                                <option value="admin">Admin</option>
                                                <option value="muhasebe">Muhasebe</option>
                                                <option value="satinalma">Satın Alma</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.status === 'pending_approval' ? (
                                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    Onay Bekliyor
                                                </span>
                                            ) : user.status === 'active' ? (
                                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400">
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400">
                                                    Reddedildi
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {user.id !== profile?.id && (
                                                <div className="flex items-center justify-end gap-2">
                                                    {user.status !== 'active' && user.status !== 'deleted' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'active')}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                                                            title="Onayla"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                                        </button>
                                                    )}
                                                    {user.status !== 'rejected' && user.status !== 'deleted' && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'rejected')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                            title="Reddet/Engelle"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">cancel</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteClick(user.id, user.full_name || 'Bu kullanıcı')}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                        title="Kullanıcıyı Sil"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kullanıcıyı Sil</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Bu işlem geri alınamaz</p>
                                </div>
                            </div>
                            <button
                                onClick={() => !isDeleting && setDeleteModal({ isOpen: false, id: '', userName: '' })}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white">{deleteModal.userName}</span> adlı kullanıcıyı silmek istediğinize çok emin misiniz? Kullanıcı hesabı sistemden tamamen kalıcı bir şekilde silinecektir.
                            </p>
                        </div>
                        <div className="p-5 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: '', userName: '' })}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Siliniyor...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Evet, Sil
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
