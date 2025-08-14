import fs from "fs";
import * as fileFunctions from './file.js';
import * as queryFunctions from './query.js';
import colors from 'colors';
import { exec } from 'child_process';
import { table } from './config.js';

export const add_migration = (argv, path, cb) => {
  fileFunctions.validate_file_name(argv[4]);
  fileFunctions.readFolder(path, (files) => {
    const file_name = `${Date.now()}_${argv[4]}`;
    const file_path = `${path}/${file_name}.js`;

    const sql_json = {
      up: '',
      down: ''
    };

    if (argv.length > 5) {
      sql_json['up'] = argv[5];
    }

    const content = `export default ${JSON.stringify(sql_json, null, 4)}`;
    fs.writeFile(file_path, content, 'utf-8', (err) => {
      if (err) {
        throw err;
      }

      console.log(`Added file ${file_name}`);
      cb();
    });
  });
};

export const up_migrations = async (conn, max_count, path) => {
  const results = await queryFunctions.run_query(conn, `SELECT timestamp FROM ${table} ORDER BY timestamp DESC LIMIT 1`);
  const file_paths = [];
  let max_timestamp = 0;
  if (results.length) {
    max_timestamp = results[0].timestamp;
  }

  const files = await new Promise((resolve, reject) => {
    fileFunctions.readFolder(path, (files) => {
      if (files) {
        resolve(files);
      } else {
        reject(new Error('Could not read folder'));
      }
    });
  });

  files.forEach((file) => {
    const timestamp_split = file.split("_", 1);
    if (timestamp_split.length) {
      const timestamp = parseInt(timestamp_split[0]);
      if (Number.isInteger(timestamp) && timestamp.toString().length === 13 && timestamp > max_timestamp) {
        file_paths.push({ timestamp: timestamp, file_path: file });
      }
    } else {
      throw new Error(`Invalid file ${file}`);
    }
  });

  const final_file_paths = file_paths.sort((a, b) => a.timestamp - b.timestamp).slice(0, max_count);
  await queryFunctions.execute_query(conn, path, final_file_paths, 'up');
};

export const up_migrations_all = async (conn, max_count, path) => {
  const files = await new Promise((resolve, reject) => {
    fileFunctions.readFolder(path, (files) => {
      if (files) {
        resolve(files);
      } else {
        reject(new Error('Could not read folder'));
      }
    });
  });

  const file_paths = [];
  files.forEach((file) => {
    const timestamp_split = file.split("_", 1);
    if (timestamp_split.length) {
      const timestamp = parseInt(timestamp_split[0]);
      if (Number.isInteger(timestamp) && timestamp.toString().length === 13) {
        file_paths.push({ timestamp: timestamp, file_path: file });
      }
    } else {
      throw new Error(`Invalid file ${file}`);
    }
  });

  const final_file_paths = file_paths.sort((a, b) => a.timestamp - b.timestamp).slice(0, max_count);
  await queryFunctions.execute_query(conn, path, final_file_paths, 'up');
};

export const down_migrations = async (conn, max_count, path) => {
  const results = await queryFunctions.run_query(conn, `SELECT timestamp FROM ${table} ORDER BY timestamp DESC LIMIT ${max_count}`);
  if (results.length) {
    const temp_timestamps = results.map((ele) => ele.timestamp);
    const file_paths = [];

    const files = await new Promise((resolve, reject) => {
      fileFunctions.readFolder(path, (files) => {
        if (files) {
          resolve(files);
        } else {
          reject(new Error('Could not read folder'));
        }
      });
    });

    files.forEach((file) => {
      const timestamp = file.split("_", 1)[0];
      if (temp_timestamps.indexOf(timestamp) > -1) {
        file_paths.push({ timestamp: timestamp, file_path: file });
      }
    });

    const final_file_paths = file_paths.sort((a, b) => b.timestamp - a.timestamp).slice(0, max_count);
    await queryFunctions.execute_query(conn, path, final_file_paths, 'down');
  }
};

export const run_migration_directly = async (file, type, conn, path) => {
  const current_file_path = `${path}/${file}`;
  const { default: queryModule } = await import(current_file_path);
  const query = queryModule[type];
  return await queryFunctions.run_query(conn, query);
};

export const update_schema = (conn, path, cb) => {
  const conn_config = conn.config.connectionConfig;
  const filePath = `${path}/schema.sql`;
  fs.unlink(filePath, () => {
    let cmd = "mysqldump --no-data ";
    if (conn_config.host) {
      cmd += ` -h ${conn_config.host}`;
    }

    if (conn_config.port) {
      cmd += ` --port=${conn_config.port}`;
    }

    if (conn_config.user) {
      cmd += ` --user=${conn_config.user}`;
    }

    if (conn_config.password) {
      cmd += ` --password=${conn_config.password}`;
    }

    cmd += ` ${conn_config.database}`;
    exec(cmd, (error, stdout, stderr) => {
      fs.writeFile(filePath, stdout, (err) => {
        if (err) {
          console.log(colors.red("Could not save schema file"));
        }
        cb();
      });
    });
  });
};

export const createFromSchema = (conn, path, cb) => {
  const conn_config = conn.config.connectionConfig;
  const filePath = `${path}/schema.sql`;
  if (fs.existsSync(filePath)) {
    let cmd = "mysql ";
    if (conn_config.host) {
      cmd += ` -h ${conn_config.host}`;
    }

    if (conn_config.port) {
      cmd += ` --port=${conn_config.port}`;
    }

    if (conn_config.user) {
      cmd += ` --user=${conn_config.user}`;
    }

    if (conn_config.password) {
      cmd += ` --password=${conn_config.password}`;
    }

    cmd += ` ${conn_config.database}`;
    cmd += ` < ${filePath}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(colors.red(`Could not load from Schema: ${error}`));
        cb();
      } else {
        const file_paths = [];
        fileFunctions.readFolder(path, (files) => {
          files.forEach((file) => {
            const timestamp_split = file.split("_", 1);
            const timestamp = parseInt(timestamp_split[0]);
            if (timestamp_split.length) {
              file_paths.push({ timestamp: timestamp, file_path: file });
            } else {
              throw new Error(`Invalid file ${file}`);
            }
          });

          const final_file_paths = file_paths.sort((a, b) => a.timestamp - b.timestamp).slice(0, 9999999);
          queryFunctions.execute_query(conn, path, final_file_paths, 'up', false)
            .then(() => {
              cb();
            })
            .catch((error) => {
              console.error(colors.red("Error executing queries from schema:"), error);
              cb(error);
            });
        });
      }
    });
  } else {
    console.log(colors.red(`Schema Missing: ${filePath}`));
    cb();
  }
};