import { MongoClient } from 'mongodb';
import { initializeDatabase } from '../database/mongodb-schema.js';
import { insertSampleData } from '../database/sample-data.js'
import 'dotenv/config';


async function setupDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('campus_facility_booking');
  
  // Initialize schema and indexes
  await initializeDatabase(db);
  
  // Insert sample data (optional)
  await insertSampleData(db);
  
  await client.close();
}

setupDatabase().catch(console.error);