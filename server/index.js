import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TaskPoint API',
            version: '1.0.0',
            description: 'API for managing activities, logs, and redemptions in TaskPoint',
        },
        servers: [{ url: '/', description: 'Current Host' }],
    },
    apis: [__filename],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

let db;

async function initDb() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            value INTEGER NOT NULL,
            icon TEXT NOT NULL DEFAULT 'zap',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
            activity_name TEXT NOT NULL,
            points INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS redemptions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            reward_name TEXT NOT NULL,
            cost INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

// Auth Middleware
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
        const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
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
        const id = randomUUID();
        await db.run(
            'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
            [id, email, passwordHash, name]
        );
        const user = { id, email, name, is_admin: 0 };
        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({ user, token });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({
            user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            const id = randomUUID();
            await db.run(
                'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
                [id, email, name, 'google-auth-' + googleId]
            );
            user = { id, email, name, is_admin: 0 };
        }

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({
            user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
            token
        });
    } catch (err) {
        res.status(401).json({ error: 'Google authentication failed: ' + err.message });
    }
});

// --- Activities ---

app.get('/api/activities', authenticateToken, async (req, res) => {
    try {
        const activities = await db.all(
            'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at ASC',
            [req.user.id]
        );
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activities', authenticateToken, async (req, res) => {
    const { name, value, icon } = req.body;
    try {
        const id = randomUUID();
        await db.run(
            'INSERT INTO activities (id, user_id, name, value, icon) VALUES (?, ?, ?, ?, ?)',
            [id, req.user.id, name, value, icon || 'zap']
        );
        const activity = await db.get('SELECT * FROM activities WHERE id = ?', [id]);
        res.json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, value, icon } = req.body;
    try {
        await db.run(
            'UPDATE activities SET name = ?, value = ?, icon = ? WHERE id = ? AND user_id = ?',
            [name, value, icon, id, req.user.id]
        );
        const activity = await db.get('SELECT * FROM activities WHERE id = ?', [id]);
        if (!activity) return res.status(404).json({ error: 'Activity not found' });
        res.json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.run('DELETE FROM activities WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (result.changes === 0) {
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
        const logs = await db.all(
            'SELECT * FROM logs WHERE user_id = ? ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
    const { activityId, activityName, points } = req.body;
    try {
        const id = randomUUID();
        await db.run(
            'INSERT INTO logs (id, user_id, activity_id, activity_name, points) VALUES (?, ?, ?, ?, ?)',
            [id, req.user.id, activityId, activityName, points]
        );
        const log = await db.get('SELECT * FROM logs WHERE id = ?', [id]);
        res.json(log);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Redemptions ---

app.get('/api/redemptions', authenticateToken, async (req, res) => {
    try {
        const redemptions = await db.all(
            'SELECT * FROM redemptions WHERE user_id = ? ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(redemptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/redemptions', authenticateToken, async (req, res) => {
    const { rewardName, cost } = req.body;
    try {
        const id = randomUUID();
        await db.run(
            'INSERT INTO redemptions (id, user_id, reward_name, cost) VALUES (?, ?, ?, ?)',
            [id, req.user.id, rewardName, cost]
        );
        const redemption = await db.get('SELECT * FROM redemptions WHERE id = ?', [id]);
        res.json(redemption);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin ---

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await db.all(`
            SELECT u.id, u.email, u.name, u.is_admin, u.created_at,
            (SELECT COALESCE(SUM(points), 0) FROM logs WHERE user_id = u.id) as total_earned,
            (SELECT COALESCE(SUM(cost), 0) FROM redemptions WHERE user_id = u.id) as total_spent
            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/stats/daily', authenticateToken, isAdmin, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT date(timestamp) as day, COUNT(*) as count, SUM(points) as points
            FROM logs
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        `);
        const redemptions = await db.all(`
            SELECT date(timestamp) as day, COUNT(*) as count, SUM(cost) as cost
            FROM redemptions
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        `);
        res.json({ logs, redemptions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users/:id/toggle-admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('UPDATE users SET is_admin = NOT is_admin WHERE id = ?', [id]);
        const user = await db.get('SELECT id, email, name, is_admin FROM users WHERE id = ?', [id]);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// For any other request, send back index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Initialize database and start server
initDb().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://localhost:${port}`);
    });
});
