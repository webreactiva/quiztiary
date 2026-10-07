// npm run reset-db — deletes the questions database. Stop the server first: a running server
// keeps writing to the deleted file. The database is created empty on the next start.
import { rmSync } from 'node:fs';
import config from '../quiztiary.config.mjs';

const db = process.env.DB_PATH || `${config.slug}.db`;
for (const f of [db, `${db}-wal`, `${db}-shm`]) rmSync(f, { force: true });
console.log(`Deleted ${db}. It is created empty on the next npm start.`);
