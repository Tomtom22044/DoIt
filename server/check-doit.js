import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const uri = process.env.MONGODB_URI;

async function run() {
    console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@'));
    try {
        // Encode URI manually because of the @ in password
        const prefix = "mongodb+srv://";
        const rest = uri.slice(prefix.length);
        const lastAtIndex = rest.lastIndexOf('@');
        const userinfo = rest.slice(0, lastAtIndex);
        const hostPart = rest.slice(lastAtIndex + 1);
        const [username, ...passwordParts] = userinfo.split(':');
        const password = passwordParts.join(':');

        const fixedUri = `${prefix}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostPart}`;

        const conn = await mongoose.createConnection(fixedUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
        console.log('Connected!');

        const collections = await conn.db.listCollections().toArray();
        console.log('Collections in DoIt:', collections.map(c => c.name));

        for (const col of collections) {
            const data = await conn.db.collection(col.name).find({}).limit(5).toArray();
            console.log(`\n--- ${col.name} ---`);
            console.log(JSON.stringify(data, null, 2));
        }
        await conn.close();
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
    process.exit(0);
}

run();
