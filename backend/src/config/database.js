const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'edu_crm_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL database connected successfully.');
  } catch (error) {
    // If database does not exist (PostgreSQL error 3D000)
    if (error.original && (error.original.code === '3D000' || String(error.message).includes('does not exist'))) {
      const targetDbName = process.env.DB_NAME || 'edu_crm_db';
      console.log(`⚠️ Database "${targetDbName}" does not exist. Creating it automatically on PostgreSQL...`);
      try {
        const { Client } = require('pg');
        const adminClient = new Client({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: 'postgres',
        });
        await adminClient.connect();
        const safeDbName = targetDbName.replace(/"/g, '""');
        await adminClient.query(`CREATE DATABASE "${safeDbName}";`);
        await adminClient.end();
        console.log(`✅ Database "${safeDbName}" created successfully. Connecting...`);
        await sequelize.authenticate();
        console.log('✅ PostgreSQL database connected successfully.');
        return;
      } catch (createErr) {
        console.error('❌ Failed to auto-create database:', createErr.message);
      }
    }
    console.error('❌ Unable to connect to the database:', error.message);
  }
};

module.exports = {
  sequelize,
  connectDB
};
