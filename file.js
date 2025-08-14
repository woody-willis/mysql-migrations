import fs from "fs";

export function validate_file_name(file_name) {
  const patt = /^[0-9a-zA-Z-_]+$/;
  if (!patt.test(file_name)) {
    throw new Error("File name can contain alphabets, numbers, hyphen or underscore");
  }
}

export function readFolder(path, cb) {
  fs.readdir(path, (err, files) => {
    if (err) {
      throw err;
    }

    const schemaPath = files.indexOf("schema.sql");
    if (schemaPath > -1) {
      files.splice(schemaPath, 1);
    }
    cb(files);
  });
}

export function readFile(path, cb) {
  fs.readFile(path, (err, data) => {
    if (err) {
      throw err;
    }

    cb(data);
  });
}