import fs from "fs";
import * as coreFunctions from './core_functions.js';
import * as queryFunctions from './query.js';
import * as config from './config.js';

const table = config['table'];
const migrations_types = config['migrations_types'];

let updateSchema = false;
let migrate_all = false;

function migration(conn, path, cb, options) {
  if (cb == null) {
    cb = () => {};
  }
  let argv = process.argv;
  const updateSchemaIndex = argv.indexOf("--update-schema");
  if (updateSchemaIndex > -1) {
    updateSchema = true;
    argv.splice(updateSchemaIndex, 1);
  }

  const migrate_index = argv.indexOf("--migrate-all");
  if (migrate_index > -1) {
    migrate_all = true;
    argv.splice(migrate_index, 1);
  }

  if (options instanceof Array) {
    if (options.indexOf("--migrate-all") > -1) {
      migrate_all = true;
    }

    if (options.indexOf("--update-schema") > -1) {
      updateSchema = true;
    }
  }

  queryFunctions.run_query(conn, "CREATE TABLE IF NOT EXISTS `" + table + "` (`timestamp` varchar(254) NOT NULL UNIQUE)")
    .then(() => {
      handle(argv, conn, path, cb);
    })
    .catch((error) => {
      console.error("Error creating table:", error);
      cb(error);
    });
}

function handle(argv, conn, path, cb) {
  if (argv.length > 2 && argv.length <= 6) {
    if (argv[2] == 'add' && (argv[3] == 'migration' || argv[3] == 'seed')) {
      coreFunctions.add_migration(argv, path, function() {
        conn.end();
        cb();
      });
    } else if (argv[2] == 'up') {
      let count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else {
        count = 999999;
      }
      if (migrate_all) {
        coreFunctions.up_migrations_all(conn, count, path)
          .then(() => {
            updateSchemaAndEnd(conn, path);
            cb();
          })
          .catch((error) => {
            console.error("Error during up migrations:", error);
            cb(error);
          });
      } else {
        coreFunctions.up_migrations(conn, count, path)
          .then(() => {
            updateSchemaAndEnd(conn, path);
            cb();
          })
          .catch((error) => {
            console.error("Error during up migrations:", error);
            cb(error);
          });
      }
    } else if (argv[2] == 'down') {
      let count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else count = 1;
      coreFunctions.down_migrations(conn, count, path)
        .then(() => {
          updateSchemaAndEnd(conn, path);
          cb();
        })
        .catch((error) => {
          console.error("Error during down migrations:", error);
          cb(error);
        });
    } else if (argv[2] == 'refresh') {
      coreFunctions.down_migrations(conn, 999999, path)
        .then(() => {
          return coreFunctions.up_migrations_all(conn, 999999, path);
        })
        .then(() => {
          updateSchemaAndEnd(conn, path);
          cb();
        })
        .catch((error) => {
          console.error("Error during refresh migrations:", error);
          cb(error);
        });
    } else if (argv[2] == 'run' && migrations_types.indexOf(argv[4]) > -1) {
      coreFunctions.run_migration_directly(argv[3], argv[4], conn, path)
        .then(() => {
          updateSchemaAndEnd(conn, path);
          cb();
        })
        .catch((error) => {
          console.error("Error running migration directly:", error);
          cb(error);
        });
    } else if (argv[2] == 'load-from-schema') {
      coreFunctions.createFromSchema(conn, path, function() {
        conn.end();
        cb();
      });
    } else {
      throw new Error('command not found : ' + argv.join(" "));
    }
  }
}

function updateSchemaAndEnd(conn, path) {
  if (updateSchema) {
    coreFunctions.update_schema(conn, path, function() {
      conn.end();
    })
  } else {
    conn.end();
  }
}

export const init = migration;