// Initialise (and seed) the database without starting the web server.
// Usage: npm run seed
import 'dotenv/config';
import { DB_PATH } from '../src/db.js';

console.log(`\n  Database ready at: ${DB_PATH}`);
console.log('  Seed complete. You can now run: npm start\n');
process.exit(0);
