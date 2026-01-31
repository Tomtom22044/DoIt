import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import { Users, BarChart3, Shield, ShieldOff, User } from 'lucide-react';
import styles from './AdminPanel.module.css';

export default function AdminPanel() {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/stats/daily', { headers })
            ]);

            const [usersData] = await Promise.all([
                usersRes.json(),
                statsRes.json()
            ]);

            setUsers(usersData);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleAdmin = async (userId) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: updatedUser.is_admin } : u));
            }
        } catch (err) {
            console.error('Failed to toggle admin status:', err);
        }
    };

    if (loading) return <div>טוען נתוני ניהול...</div>;

    const totalPoints = users.reduce((sum, u) => sum + Number(u.total_earned), 0);
    const totalRedeemed = users.reduce((sum, u) => sum + Number(u.total_spent), 0);

    return (
        <div className={styles.container}>
            <div className={styles.statsGrid}>
                <Card className={styles.statCard}>
                    <span className={styles.statValue}>{users.length}</span>
                    <span className={styles.statLabel}>משתמשים</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statValue}>{totalPoints}</span>
                    <span className={styles.statLabel}>נקודות שנצברו</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statValue}>{totalRedeemed}</span>
                    <span className={styles.statLabel}>נקודות שמומשו</span>
                </Card>
            </div>

            <div className={styles.section}>
                <h2><Users size={20} /> ניהול משתמשים</h2>
                <div className={styles.userList}>
                    {users.map(u => (
                        <Card key={u.id} className={styles.userCard}>
                            <div className={styles.avatar}>
                                <User size={20} />
                            </div>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>
                                    {u.name} {u.is_admin && <span className={styles.adminBadge}>ADMIN</span>}
                                </div>
                                <div className={styles.userEmail}>{u.email}</div>
                                <div className={styles.userStats}>
                                    <span className={styles.pointsEarned}>+{u.total_earned}</span>
                                    <span className={styles.pointsSpent}>-{u.total_spent}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleAdmin(u.id)}
                                className={styles.toggleAdminBtn}
                                title={u.is_admin ? "בטל הרשאת מנהל" : "הפוך למנהל"}
                            >
                                {u.is_admin ? <ShieldOff size={18} /> : <Shield size={18} />}
                            </button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
