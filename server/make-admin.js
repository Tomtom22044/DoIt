import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskpoint';

const userSchema = new mongoose.Schema({
    email: String,
    is_admin: Boolean
});

const User = mongoose.model('User', userSchema);

async function setAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        const email = process.argv[2];
        if (!email) {
            console.log('Please provide an email: node make-admin.js example@test.com');
            process.exit(1);
        }

        const result = await User.updateOne({ email }, { $set: { is_admin: true } });
        if (result.matchedCount > 0) {
            console.log(`User ${email} is now an admin.`);
        } else {
            console.log(`User ${email} not found.`);
        }
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

setAdmin();
