import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import { useAuth } from './AuthContext';

const StorageContext = createContext(null);

const API_URL = '/api';

export function StorageProvider({ children }) {
    const { token, user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [logs, setLogs] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const [actRes, logRes, redRes] = await Promise.all([
                fetch(`${API_URL}/activities`, { headers }),
                fetch(`${API_URL}/logs`, { headers }),
                fetch(`${API_URL}/redemptions`, { headers })
            ]);

            const [actData, logData, redData] = await Promise.all([
                actRes.json(),
                logRes.json(),
                redRes.json()
            ]);

            setActivities(actData.map(a => ({
                id: a.id,
                name: a.name,
                value: a.value,
                icon: a.icon,
                createdAt: a.created_at
            })));

            setLogs(logData.map(l => ({
                id: l.id,
                activityId: l.activity_id,
                activityName: l.activity_name,
                points: l.points,
                timestamp: l.timestamp
            })));

            setRedemptions(redData.map(r => ({
                id: r.id,
                rewardName: r.reward_name,
                cost: r.cost,
                timestamp: r.timestamp
            })));
        } catch (e) {
            console.error('Failed to load data from API', e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchData();
        } else {
            setActivities([]);
            setLogs([]);
            setRedemptions([]);
            setLoading(false);
        }
    }, [token, fetchData]);

    const totalPoints = useMemo(() => {
        const earned = logs.reduce((sum, log) => sum + log.points, 0);
        const spent = redemptions.reduce((sum, r) => sum + r.cost, 0);
        return earned - spent;
    }, [logs, redemptions]);

    const todayPoints = useMemo(() => {
        const today = new Date();
        return logs
            .filter(log => isSameDay(new Date(log.timestamp), today))
            .reduce((sum, log) => sum + log.points, 0);
    }, [logs]);

    const addActivity = async (activity) => {
        try {
            const res = await fetch(`${API_URL}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(activity),
            });
            const a = await res.json();
            const newAct = {
                id: a.id,
                name: a.name,
                value: a.value,
                icon: a.icon,
                createdAt: a.created_at
            };
            setActivities(prev => [...prev, newAct]);
        } catch (e) {
            console.error('Failed to add activity', e);
        }
    };

    const performActivity = async (activity) => {
        try {
            const res = await fetch(`${API_URL}/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    activityId: activity.id,
                    activityName: activity.name,
                    points: activity.value
                }),
            });
            const l = await res.json();
            const newLog = {
                id: l.id,
                activityId: l.activity_id,
                activityName: l.activity_name,
                points: l.points,
                timestamp: l.timestamp
            };
            setLogs(prev => [newLog, ...prev]);
        } catch (e) {
            console.error('Failed to perform activity', e);
        }
    };

    const redeemReward = async (rewardName, cost) => {
        if (cost > totalPoints) return false;

        try {
            const res = await fetch(`${API_URL}/redemptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rewardName, cost }),
            });
            const r = await res.json();
            const newRedemption = {
                id: r.id,
                rewardName: r.reward_name,
                cost: r.cost,
                timestamp: r.timestamp
            };
            setRedemptions(prev => [newRedemption, ...prev]);
            return true;
        } catch (e) {
            console.error('Failed to redeem reward', e);
            return false;
        }
    };

    const updateActivity = async (id, updatedFields) => {
        try {
            const res = await fetch(`${API_URL}/activities/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedFields),
            });
            const a = await res.json();
            const updatedAct = {
                id: a.id,
                name: a.name,
                value: a.value,
                icon: a.icon,
                createdAt: a.created_at
            };
            setActivities(prev => prev.map(a => a.id === id ? updatedAct : a));
        } catch (e) {
            console.error('Failed to update activity', e);
        }
    };

    const deleteActivity = async (id) => {
        try {
            await fetch(`${API_URL}/activities/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivities(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error('Failed to delete activity', e);
        }
    };

    const value = {
        activities,
        logs,
        redemptions,
        totalPoints,
        todayPoints,
        loading,
        addActivity,
        updateActivity,
        deleteActivity,
        performActivity,
        redeemReward
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
}

export function useStorage() {
    const context = useContext(StorageContext);
    if (!context) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
}
