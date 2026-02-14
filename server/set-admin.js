import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    is_admin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function makeAdmin(email) {
    try {
        console.log(`Connecting to ${MONGODB_URI.split('@')[1]}...`);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const result = await User.updateOne({ email }, { $set: { is_admin: true } });
        console.log('Update result:', result);

        const user = await User.findOne({ email });
        console.log('User status:', user ? { email: user.email, is_admin: user.is_admin } : 'User not found');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

makeAdmin('tomtom2204@gmail.com');
