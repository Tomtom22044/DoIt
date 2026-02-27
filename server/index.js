import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import webpush from 'web-push';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure web-push
webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:example@yourdomain.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskpoint';
console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`);
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Successfully'))
    .catch(err => console.error('CRITICAL: MongoDB connection error:', err));

// --- Schemas & Models ---

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    name: { type: String },
    is_admin: { type: Boolean, default: false },
    push_subscriptions: [mongoose.Schema.Types.Mixed],
    created_at: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    value: { type: Number, required: true },
    icon: { type: String, default: 'zap' },
    created_at: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    activity_name: { type: String, required: true },
    points: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const redemptionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reward_name: { type: String, required: true },
    cost: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Transform ObjectIds to strings and _id to id for frontend compatibility
const transform = (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
};

userSchema.set('toJSON', { transform });
activitySchema.set('toJSON', { transform });
logSchema.set('toJSON', { transform });
redemptionSchema.set('toJSON', { transform });

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Log = mongoose.model('Log', logSchema);
const Redemption = mongoose.model('Redemption', redemptionSchema);

// --- Auth Middleware ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- Auth Routes ---

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ email, password_hash: passwordHash, name });
        await user.save();

        const token = jwt.sign({ id: user._id.toString(), email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({
            user: { id: user._id.toString(), email: user.email, name: user.name, is_admin: user.is_admin },
            token
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id.toString(), email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({
            user: { id: user._id.toString(), email: user.email, name: user.name, is_admin: user.is_admin },
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Activities ---

app.get('/api/activities', authenticateToken, async (req, res) => {
    try {
        const activities = await Activity.find({ user_id: req.user.id }).sort('created_at');
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activities', authenticateToken, async (req, res) => {
    const { name, value, icon } = req.body;
    try {
        const activity = new Activity({ user_id: req.user.id, name, value, icon: icon || 'zap' });
        await activity.save();
        res.json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, value, icon } = req.body;
    try {
        const activity = await Activity.findOneAndUpdate(
            { _id: id, user_id: req.user.id },
            { name, value, icon },
            { new: true }
        );
        if (!activity) return res.status(404).json({ error: 'Activity not found' });
        res.json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Activity.deleteOne({ _id: id, user_id: req.user.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Logs ---

app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const logs = await Log.find({ user_id: req.user.id }).sort('-timestamp');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
    const { activityId, activityName, points } = req.body;
    try {
        const log = new Log({ user_id: req.user.id, activity_id: activityId, activity_name: activityName, points });
        await log.save();
        res.json(log);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Redemptions ---

app.get('/api/redemptions', authenticateToken, async (req, res) => {
    try {
        const redemptions = await Redemption.find({ user_id: req.user.id }).sort('-timestamp');
        res.json(redemptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/redemptions', authenticateToken, async (req, res) => {
    const { rewardName, cost } = req.body;
    try {
        const redemption = new Redemption({ user_id: req.user.id, reward_name: rewardName, cost });
        await redemption.save();
        res.json(redemption);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin ---

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().sort('-created_at');
        const enrichedUsers = await Promise.all(users.map(async u => {
            const logs = await Log.find({ user_id: u._id });
            const redemptions = await Redemption.find({ user_id: u._id });

            const total_earned = logs.reduce((sum, l) => sum + l.points, 0);
            const total_spent = redemptions.reduce((sum, r) => sum + r.cost, 0);

            const userJson = u.toJSON();
            return { ...userJson, total_earned, total_spent };
        }));
        res.json(enrichedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/stats/daily', authenticateToken, isAdmin, async (req, res) => {
    try {
        const dailyStats = await Log.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    count: { $sum: 1 },
                    points: { $sum: "$points" }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
            { $project: { day: "$_id", count: 1, points: 1, _id: 0 } }
        ]);

        const dailyRedemptions = await Redemption.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    count: { $sum: 1 },
                    cost: { $sum: "$cost" }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
            { $project: { day: "$_id", count: 1, cost: 1, _id: 0 } }
        ]);

        res.json({ logs: dailyStats, redemptions: dailyRedemptions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users/:id/toggle-admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.is_admin = !user.is_admin;
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Push Notification Routes ---

app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
    const subscription = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Add subscription if it doesn't exist
        const subExists = user.push_subscriptions.some(
            sub => sub.endpoint === subscription.endpoint
        );

        if (!subExists) {
            user.push_subscriptions.push(subscription);
            await user.save();
        }

        res.status(201).json({});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/push/test', authenticateToken, isAdmin, async (req, res) => {
    const { title, body } = req.body;
    const payload = JSON.stringify({ title, body });

    try {
        const users = await User.find({ 'push_subscriptions.0': { $exists: true } });
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            const validSubscriptions = [];
            for (const sub of user.push_subscriptions) {
                try {
                    await webpush.sendNotification(sub, payload);
                    successCount++;
                    validSubscriptions.push(sub);
                } catch (error) {
                    console.error(`Failed to send push to user ${user._id}:`, error);
                    failCount++;
                    // If error is 410 (Gone) or 404 (Not Found), remove the subscription
                    if (error.statusCode !== 410 && error.statusCode !== 404) {
                        validSubscriptions.push(sub);
                    }
                }
            }
            if (validSubscriptions.length !== user.push_subscriptions.length) {
                user.push_subscriptions = validSubscriptions;
                await user.save();
            }
        }

        res.json({ success: true, successCount, failCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Swagger Docs (basic definition)
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TaskPoint API',
            version: '1.0.0',
            description: 'TaskPoint Backend API Documentation',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
    },
    apis: [path.join(__dirname, 'index.js')],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// For any other request, send back index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (err) => {
    console.error('CRITICAL: Server failed to start:', err);
    if (err.code === 'EACCES') {
        console.error(`Permission denied: You cannot bind to port ${port} as a non-root user.`);
    }
});
