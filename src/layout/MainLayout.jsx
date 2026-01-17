import { Activity, LayoutDashboard, Trophy, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './MainLayout.module.css';

const TABS = [
    { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
    { id: 'activities', label: 'פעילויות', icon: Activity },
    { id: 'rewards', label: 'פרסים', icon: Trophy },
];

export default function MainLayout({ children, activeTab, onTabChange }) {
    const { user, logout } = useAuth();

    const availableTabs = user?.is_admin
        ? [...TABS, { id: 'admin', label: 'ניהול', icon: Shield }]
        : TABS;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Do It</h1>
                    <div className={styles.userMenu}>
                        <span className={styles.userName}>{user?.name}</span>
                        <button onClick={logout} className={styles.logoutBtn} title="התנתקות">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {children}
            </main>

            <nav className={styles.nav}>
                {availableTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={styles.navLabel}>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
