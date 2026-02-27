import webpush from 'web-push';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:example@yourdomain.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const userSchema = new mongoose.Schema({
    push_subscriptions: [mongoose.Schema.Types.Mixed]
});

const User = mongoose.model('User', userSchema);

async function broadcast() {
    try {
        await mongoose.connect(MONGODB_URI);
        const title = process.argv[2] || 'Test Header';
        const body = process.argv[3] || 'This is a test notification from the server!';
        const payload = JSON.stringify({ title, body });

        const users = await User.find({ 'push_subscriptions.0': { $exists: true } });
        console.log(`Found ${users.length} users with push subscriptions.`);

        for (const user of users) {
            for (const sub of user.push_subscriptions) {
                try {
                    await webpush.sendNotification(sub, payload);
                    console.log('Push sent successfully.');
                } catch (err) {
                    console.error('Error sending push:', err.statusCode);
                }
            }
        }
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

broadcast();
