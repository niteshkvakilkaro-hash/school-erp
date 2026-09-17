import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
    host: env.db.host,
    port: env.db.port,
    dialect: 'mysql',
    logging: env.db.logging ? console.log : false,
    define: {
        underscored: true,
        freezeTableName: false,
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    timezone: '+05:30',
});

/**
 * XAMPP par database khud se nahi banta, isliye pehle CREATE DATABASE IF NOT EXISTS
 * chala dete hain — warna `npm run db:seed` fresh machine par fail hota hai.
 */
export async function ensureDatabaseExists() {
    const connection = await mysql.createConnection({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
    });
    await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.end();
}

export async function connectDatabase() {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    return sequelize;
}
