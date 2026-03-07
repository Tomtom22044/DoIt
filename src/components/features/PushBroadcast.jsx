import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, Bell, Loader2, BellRing } from 'lucide-react';
import { requestNotificationPermission } from '../../utils/pushManager';
import styles from './PushBroadcast.module.css';

export default function PushBroadcast() {
    const { token } = useAuth();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(Notification.permission === 'granted');

    const handleSubscribe = async () => {
        const granted = await requestNotificationPermission();
        setIsSubscribed(granted);
        if (granted) {
            setStatus({
                type: 'success',
                message: 'מעולה! המכשיר שלך רשום כעת לקבלת התראות.'
            });
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title || !body) return;

        setLoading(true);
        setStatus(null);

        try {
            const response = await fetch('/api/push/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, body })
            });

            if (response.ok) {
                const result = await response.json();
                setStatus({
                    type: 'success',
                    message: `ההתראה נשלחה בהצלחה! (${result.successCount} משלוחים מוצלחים)`
                });
                setTitle('');
                setBody('');
            } else {
                throw new Error('שגיאה בשליחת ההתראה');
            }
        } catch (err) {
            console.error('Failed to send push broadcast:', err);
            setStatus({
                type: 'error',
                message: 'שגיאה בחיבור לשרת או בהרשאות.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.section}>
            <h2><BellRing size={20} /> שליחת התראה לכל המשתמשים</h2>

            <div className={styles.adminSubscription}>
                <div className={styles.subscriptionStatus}>
                    {isSubscribed ? (
                        <div className={styles.activeSubscription}>
                            <span className={styles.checkIcon}>✅</span>
                            מכשיר זה רשום (בדפדפן). אם אינך מקבל הודעות, נסה "רישום מחדש".
                        </div>
                    ) : (
                        <div className={styles.inactiveSubscription}>
                            <span className={styles.crossIcon}>❌</span>
                            מכשיר זה אינו רשום לקבלת התראות.
                        </div>
                    )}
                </div>
                <button type="button" onClick={handleSubscribe} className={styles.subscribeBtn}>
                    <BellRing size={16} />
                    {isSubscribed ? "רישום מחדש של המכשיר" : "הפעל התראות במכשיר זה"}
                </button>
            </div>

            <form className={styles.form} onSubmit={handleSend}>
                <div className={styles.inputGroup}>
                    <label htmlFor="pushTitle">כותרת ההתראה</label>
                    <input
                        id="pushTitle"
                        type="text"
                        className={styles.input}
                        placeholder="למשל: עדכון חדש במערכת"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="pushBody">תוכן ההתראה</label>
                    <textarea
                        id="pushBody"
                        className={`${styles.input} ${styles.textarea}`}
                        placeholder="למשל: שיפרנו את מהירות הטעינה של הדף הראשי..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={loading || !title || !body}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            שולח...
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            שלח לכל המשתמשים
                        </>
                    )}
                </button>

                {status && (
                    <div className={`${styles.status} ${status.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
}
