import { table } from './config.js';
import * as fileFunctions from './file.js';
import colors from 'colors';

async function run_query(conn, query, run = true) {
  if (!run) {
    return {};
  }

  try {
    const [results] = await conn.query(query);
    return results;
  } catch (error) {
    throw error;
  }
}

async function execute_query(conn, path, final_file_paths, type, run = true) {
  for (const file_path_info of final_file_paths) {
    const file_name = file_path_info['file_path'];
    const current_file_path = `${path}/${file_name}`;

    try {
      const queries = await import(current_file_path);

      const timestamp_val = file_name.split("_")[0];
      if (typeof queries[type] === 'string') {
        await run_query(conn, queries[type], run);
        await updateRecords(conn, type, table, timestamp_val);
      } else if (typeof queries[type] === 'function') {
        await queries[type](conn);
        await updateRecords(conn, type, table, timestamp_val);
      }
    } catch (error) {
      console.error(colors.red(`Error processing file ${file_name}:`), error);
    }
  }

  console.info(colors.blue(`No more ${type.toUpperCase()} migrations to run`));
}

async function updateRecords(conn, type, table, timestamp_val) {
  let query = '';
  if (type === 'up') {
    query = `INSERT INTO ${table} (\`timestamp\`) VALUES ('${timestamp_val}')`;
  } else if (type === 'down') {
    query = `DELETE FROM ${table} WHERE \`timestamp\` = '${timestamp_val}'`;
  }

  if (query) {
    await run_query(conn, query);
  }
}

export {
  run_query,
  execute_query,
  updateRecords
};