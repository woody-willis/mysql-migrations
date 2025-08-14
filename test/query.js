import chai from 'chai';
import * as queryFunctions from '../query.js';
import testCommons from './test_commons.js';
import mysql from './mysql.js';
import assert from 'assert';

const should = chai.should();

describe('query.js', function() {
  before(function (done) {
    testCommons(done);
  });

  context('updateRecords', function () {
    const timestamp = Date.now();
    const table = 'user1';

    it('should insert into table when up', async function () {
      const connection = await mysql.getConnection();

      await connection.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (timestamp VARCHAR(255))`);
      await queryFunctions.updateRecords(connection, 'up', table, timestamp);

      const res = await connection.query(`SELECT * FROM \`${table}\` WHERE timestamp="${timestamp}"`);

      assert.ok(res[0].length);
    });

    it('should delete from table when down', async function () {
      const connection = await mysql.getConnection();
  
      await queryFunctions.updateRecords(connection, 'down', table, timestamp);

      const res = await connection.query(`SELECT * FROM \`${table}\` WHERE timestamp="${timestamp}"`);

      assert.ok(!res[0].length);
    });
  });
});