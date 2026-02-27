import { useStorage } from '../../context/StorageContext';
import { generateDailySummary } from '../../utils/notificationUtils';
import styles from './DailyNotification.module.css';
import { Sparkles, Info, Coffee, Bell, BellRing, Timer } from 'lucide-react';
import { requestNotificationPermission, sendLocalNotification } from '../../utils/pushManager';
import { useState, useEffect } from 'react';

export default function DailyNotification() {
    const { todayPoints } = useStorage();

    // Check if it's "end of day" (after 5 PM)
    const isEOD = new Date().getHours() >= 17;

    // For demonstration purposes, we might want to show it anyway if they have points
    // But let's follow the "end of day" request strictly or make it always visible in the dashboard as a "Today's Summary"

    const message = generateDailySummary(todayPoints);

    const [permission, setPermission] = useState(Notification.permission);
    const [timerActive, setTimerActive] = useState(false);

    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setPermission(granted ? 'granted' : 'denied');
        if (granted) {
            sendLocalNotification('מעולה!', 'מעכשיו תקבל עדכונים על ההתקדמות שלך.');
        }
    };

    const triggerPush = () => {
        sendLocalNotification('סיכום יום ב-TaskPoint', message);
    };

    const startTestTimer = () => {
        if (permission !== 'granted') {
            handleRequestPermission();
            return;
        }
        setTimerActive(true);
        setTimeout(() => {
            sendLocalNotification('טיימר הושלם!', 'עברו 2 דקות. הנה התראת הבדיקה שלך.');
            setTimerActive(false);
        }, 120000); // 2 minutes
    };

    const getIcon = () => {
        if (todayPoints === 0) return <Coffee size={24} className={styles.iconRest} />;
        if (todayPoints <= 50) return <Info size={24} className={styles.iconInfo} />;
        return <Sparkles size={24} className={styles.iconSuccess} />;
    };

    return (
        <div className={styles.notificationCard}>
            <div className={styles.iconContainer}>
                {getIcon()}
            </div>
            <div className={styles.content}>
                <div className={styles.headerRow}>
                    <h4 className={styles.title}>סיכום יומי</h4>
                    {permission !== 'granted' ? (
                        <button onClick={handleRequestPermission} className={styles.notifyButton} title="הפעל התראות">
                            <Bell size={16} />
                        </button>
                    ) : (
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={startTestTimer}
                                className={timerActive ? styles.notifyButtonTimerActive : styles.notifyButton}
                                title="שלח התראה בעוד 2 דקות"
                                disabled={timerActive}
                            >
                                <Timer size={16} />
                                {timerActive && <span className={styles.timerText}>2ד'</span>}
                            </button>
                            <button onClick={triggerPush} className={styles.notifyButtonActive} title="שלח התראת בדיקה">
                                <BellRing size={16} />
                            </button>
                        </div>
                    )}
                </div>
                <p className={styles.message}>{message}</p>
            </div>
        </div>
    );
}
