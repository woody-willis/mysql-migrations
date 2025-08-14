import chai from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

import * as coreFunctions from '../core_functions.js';
import testCommons from './test_commons.js';
import * as mysql from './mysql.js';

const should = chai.should();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('core_functions.js', () => {
  before((done) => {
    testCommons(done);
  });

  context('add_migration', () => {
    it('should add migration', (done) => {
      const commands = ['node', 'migration', 'add', 'migration', 'create_user2'];
      const migrationsPath = path.join(__dirname, 'migrations');

      coreFunctions.add_migration(commands, migrationsPath, () => {
        const files = fs.readdirSync(migrationsPath);
        files.forEach((file) => {
          assert.ok(file.includes('create_user2'));
        });

        done();
      });
    });
  });
});