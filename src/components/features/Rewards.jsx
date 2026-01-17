import { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Gift, Clock, AlertCircle, ShoppingBag } from 'lucide-react';
import styles from './Rewards.module.css';

export default function Rewards() {
    const { totalPoints, redemptions, redeemReward } = useStorage();

    const [rewardName, setRewardName] = useState('');
    const [cost, setCost] = useState(100);
    const [error, setError] = useState(null);

    const handleRedeem = (e) => {
        e.preventDefault();
        setError(null);

        if (!rewardName) {
            setError('אנא הזן שם פרס');
            return;
        }

        if (cost <= 0) {
            setError('העלות חייבת להיות גדולה מ-0');
            return;
        }

        const success = redeemReward(rewardName, cost);
        if (success) {
            setRewardName('');
            setCost(100);
        } else {
            setError('אין מספיק נקודות!');
        }
    };

    return (
        <div className={styles.container}>
            <Card className={styles.balanceCard}>
                <div className={styles.balanceHeader}>יתרה זמינה</div>
                <div className={styles.balanceValue}>{totalPoints.toLocaleString()} נקודות</div>
            </Card>

            <div className={styles.redeemSection}>
                <h3 className={styles.sectionTitle}>פדיון נקודות</h3>
                <form className={styles.redeemForm} onSubmit={handleRedeem}>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="על מה אתה מפנק את עצמך?"
                            value={rewardName}
                            onChange={e => setRewardName(e.target.value)}
                        />
                    </div>
                    <div className={styles.row}>
                        <input
                            type="number"
                            className={styles.input}
                            placeholder="עלות"
                            value={cost}
                            onChange={e => setCost(Number(e.target.value))}
                        />
                        <Button type="submit" disabled={totalPoints < cost}>
                            פדה
                        </Button>
                    </div>
                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                </form>
            </div>

            <div className={styles.historySection}>
                <h3 className={styles.sectionTitle}>
                    <Clock size={16} /> היסטוריה
                </h3>
                <div className={styles.historyList}>
                    {redemptions.length === 0 ? (
                        <div className={styles.emptyState}>אין עדיין מימושים. תפנק את עצמך!</div>
                    ) : (
                        redemptions.map(r => (
                            <div key={r.id} className={styles.historyItem}>
                                <div className={styles.historyInfo}>
                                    <div className={styles.historyName}>{r.rewardName}</div>
                                    <div className={styles.historyDate}>
                                        {new Date(r.timestamp).toLocaleDateString('he-IL')} • {new Date(r.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className={styles.historyCost}>-{r.cost}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
