import { useStorage } from '../../context/StorageContext';
import Card from '../ui/Card';
import styles from './Dashboard.module.css';
import { TrendingUp, Award, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import DailyNotification from '../ui/DailyNotification';

export default function Dashboard() {
    const { totalPoints, todayPoints, logs, redemptions } = useStorage();

    const history = [
        ...logs.map(l => ({ ...l, type: 'earning' })),
        ...redemptions.map(r => ({ ...r, type: 'spending', activityName: r.rewardName, points: -r.cost }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    return (
        <div className={styles.container}>
            <DailyNotification />
            <div className={styles.statsGrid}>
                <Card className={styles.balanceCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardLabel}>יתרה כוללת</span>
                        <Award className={styles.cardIcon} size={20} />
                    </div>
                    <div className={styles.balanceValue}>{totalPoints.toLocaleString()}</div>
                    <div className={styles.pointsLabel}>נקודות זמינות</div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardLabel}>נצבר היום</span>
                        <TrendingUp className={styles.cardIcon} size={20} />
                    </div>
                    <div className={styles.statValue}>+ {todayPoints.toLocaleString()}</div>
                    <div className={styles.pointsLabel}>כל הכבוד!</div>
                </Card>
            </div>

            <div className={styles.historySection}>
                <h3 className={styles.sectionTitle}>
                    <Clock size={18} /> פעילות אחרונה
                </h3>
                <div className={styles.historyList}>
                    {history.length === 0 ? (
                        <div className={styles.emptyState}>אין פעילות עדיין. הגיע הזמן להתחיל!</div>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className={styles.historyItem}>
                                <div className={`${styles.historyIcon} ${styles[item.type]}`}>
                                    {item.type === 'earning' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                </div>
                                <div className={styles.historyInfo}>
                                    <div className={styles.historyName}>{item.activityName}</div>
                                    <div className={styles.historyDate}>
                                        {new Date(item.timestamp).toLocaleDateString('he-IL')} • {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className={`${styles.historyPoints} ${styles[item.type]}`}>
                                    {item.points > 0 ? '+' : ''}{item.points}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
