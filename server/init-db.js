import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const uri = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    name: { type: String },
    is_admin: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

async function run() {
    console.log('Using URI:', uri.replace(/:([^:@]+)@/, ':****@'));
    try {
        await mongoose.connect(uri);
        console.log('Connected!');

        const User = mongoose.model('User', userSchema, 'users');

        const email = 'tomtom2204@gmail.com';
        const rawPassword = 'admin';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(rawPassword, salt);

        const result = await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    password_hash: passwordHash,
                    is_admin: true,
                    name: 'Admin User'
                }
            },
            { upsert: true, new: true }
        );

        console.log('User updated successfully!');
        console.log('Email:', result.email);
        console.log('You can now login with password: "admin"');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

run();
