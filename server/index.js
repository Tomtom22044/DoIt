import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

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

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TaskPoint API',
            version: '1.0.0',
            description: 'API for managing activities, logs, and redemptions in TaskPoint',
        },
        servers: [
            {
                url: '/',
                description: 'Current Host',
            },
        ],
    },
    apis: ['./index.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'taskpoint',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

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
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- Auth Routes ---

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, passwordHash, name]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({
            user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
            token
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

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

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Login/Signup with Google
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Check if user exists
        let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user = result.rows[0];

        if (!user) {
            // Create user if doesn't exist
            result = await pool.query(
                'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
                [email, name, 'google-auth-' + googleId] // Placeholder hash for google users
            );
            user = result.rows[0];
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

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Retrieve a list of all activities
 *     responses:
 *       200:
 *         description: A list of activities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   value:
 *                     type: integer
 *                   icon:
 *                     type: string
 */
app.get('/api/activities', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at ASC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a new activity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - value
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: integer
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: The created activity
 */
app.post('/api/activities', authenticateToken, async (req, res) => {
    const { name, value, icon } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO activities (user_id, name, value, icon) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, name, value, icon || 'zap']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/activities/{id}:
 *   put:
 *     summary: Update an activity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: integer
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: The updated activity
 */
app.put('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, value, icon } = req.body;
    try {
        const result = await pool.query(
            'UPDATE activities SET name = $1, value = $2, icon = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [name, value, icon, id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/activities/{id}:
 *   delete:
 *     summary: Delete an activity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
app.delete('/api/activities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM activities WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Logs ---

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Retrieve activity logs
 *     responses:
 *       200:
 *         description: A list of logs
 */
app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM logs WHERE user_id = $1 ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Log a performed activity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityId
 *               - activityName
 *               - points
 *             properties:
 *               activityId:
 *                 type: string
 *                 format: uuid
 *               activityName:
 *                 type: string
 *               points:
 *                 type: integer
 *     responses:
 *       200:
 *         description: The logged entry
 */
app.post('/api/logs', authenticateToken, async (req, res) => {
    const { activityId, activityName, points } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO logs (user_id, activity_id, activity_name, points) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, activityId, activityName, points]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Redemptions ---

/**
 * @swagger
 * /api/redemptions:
 *   get:
 *     summary: Retrieve redemption history
 *     responses:
 *       200:
 *         description: A list of redemptions
 */
app.get('/api/redemptions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM redemptions WHERE user_id = $1 ORDER BY timestamp DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/redemptions:
 *   post:
 *     summary: Create a new redemption (redeem reward)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardName
 *               - cost
 *             properties:
 *               rewardName:
 *                 type: string
 *               cost:
 *                 type: integer
 *     responses:
 *       200:
 *         description: The redemption entry
 */
app.post('/api/redemptions', authenticateToken, async (req, res) => {
    const { rewardName, cost } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO redemptions (user_id, reward_name, cost) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, rewardName, cost]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Admin Routes ---

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.name, u.is_admin, u.created_at,
            (SELECT COALESCE(SUM(points), 0) FROM logs WHERE user_id = u.id) as total_earned,
            (SELECT COALESCE(SUM(cost), 0) FROM redemptions WHERE user_id = u.id) as total_spent
            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/stats/daily', authenticateToken, isAdmin, async (req, res) => {
    try {
        const logsResult = await pool.query(`
            SELECT date_trunc('day', timestamp) as day, COUNT(*) as count, SUM(points) as points
            FROM logs
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        `);
        const redemptionsResult = await pool.query(`
            SELECT date_trunc('day', timestamp) as day, COUNT(*) as count, SUM(cost) as cost
            FROM redemptions
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        `);
        res.json({
            logs: logsResult.rows,
            redemptions: redemptionsResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/users/:id/toggle-admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE users SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, email, name, is_admin',
            [id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Available on your network at http://192.168.1.120:${port}`);
    console.log(`Swagger docs available at http://192.168.1.120:${port}/api-docs`);
});
