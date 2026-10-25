import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure WebSocket for Neon in Node.js environment  
try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn('WebSocket configuration warning:', error);
}

// Create connection pool with simpler configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
});

// Initialize database connection with error handling
let db: ReturnType<typeof drizzle>;

try {
  db = drizzle({ client: pool, schema });
} catch (error) {
  console.error('Database initialization error:', error);
  throw error;
}

export { db };

// Test connection on startup
export async function testDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}