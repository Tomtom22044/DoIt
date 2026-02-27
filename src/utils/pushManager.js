import { generateDailySummary } from './notificationUtils';
const VAPID_PUBLIC_KEY = 'BAJKoovO9GwoGTYClMKA3dP2pJSjU4QigNDKiIHLYwCU_NUdDqXkWiBNO3nJy8F5fPNIB4ofcT6y7wWrxPgxfW4';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
};

export const subscribeToPush = async (registration) => {
    try {
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('Push Subscription:', JSON.stringify(subscription));

        // Send to backend
        const token = localStorage.getItem('token');
        if (token) {
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(subscription)
            });

            if (!response.ok) {
                console.error('Server rejected push subscription:', response.status);
                return false;
            }
            console.log('Push subscription saved to server successfully');
        } else {
            console.warn('No token found in localStorage, cannot save push subscription');
        }

        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return false;
    }
};

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.error('This browser does not support desktop notification');
        return false;
    }

    let permission = Notification.permission;
    if (permission !== 'granted' && permission !== 'denied') {
        permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
            await subscribeToPush(registration);
        }
        return true;
    }

    return false;
};

export const sendLocalNotification = async (title, body) => {
    const registration = await navigator.serviceWorker.ready;
    if (registration && Notification.permission === 'granted') {
        registration.showNotification(title, {
            body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            dir: 'rtl',
            lang: 'he',
            vibrate: [100, 50, 100],
        });
    }
};

export const scheduleEndOfDayNotification = (points) => {
    const message = generateDailySummary(points);
    sendLocalNotification('סיכום יום ב-TaskPoint', message);
};
