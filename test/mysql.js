import mysql from 'mysql2/promise';

export default mysql.createPool({
  connectionLimit : 20,
  host     : 'localhost',
  user     : 'root',
  password : 'hellosql',
  database : 'test_mig'
});
