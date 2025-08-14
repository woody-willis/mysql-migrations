import mysql from './mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deleteFolderRecursive = (directoryPath) => {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (!fs.lstatSync(curPath).isDirectory()) {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(directoryPath);
  }
};

export default async function(cb) {
  let connection;
  try {
    // Using a promise-based connection
    connection = await mysql.getConnection();

    await connection.query("DROP TABLE IF EXISTS user1");
    await connection.query("DROP TABLE IF EXISTS user2");
    await connection.query("DROP TABLE IF EXISTS user3");
    await connection.query("DROP TABLE IF EXISTS user4");
    await connection.query("DROP TABLE IF EXISTS user5");

    deleteFolderRecursive(path.join(__dirname, '/migrations'));
    cb();
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}