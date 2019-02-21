// Node Dependencies
const fs = require("fs");
const path = require("path");

// Internal files
const helpers = require("./helpers");

const lib = {};

// setting base dier to ./data/
lib.baseDir = path.join(__dirname, "/../.data/");

// C R U D operations

// Create file in the specified directory with the specified file name
lib.createFile = (dir, file, data,callback) => {
    fs.open(`${lib.baseDir}${dir}/${file}.json`, "wx", (err, fd) => {
        if (!err) {
            const stringData = JSON.stringify(data);
            fs.write(fd, stringData, (err) => {
               if (!err) {
                   fs.close(fd, (err) => {
                       if (!err) {
                           callback(false);
                       } else {
                           callback(`Error closing file ${dir}/${file} after writing`);
                       }
                   });
               } else {
                   callback(`Cannot write data in to file ${dir}/${file}`);
               }
            });
        } else {
            callback(`Cannot create new file ${dir}/${file} as it may already exist`);
        }
    });
};


// Read the file form teh specified directory with the specified file name.
lib.readFile = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, "utf-8",(err, data) => {
        if (!err) {
            callback(false, helpers.parseJsonToObject(data));
        } else {
            callback(`Error Reading File ${dir}/${file}`);
        }
    });
};


// Update the file from the directory with file name
lib.updateFile = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}${dir}/${file}.json`, "r+", (err, fd) => {
        if (!err && fd) {
            fs.ftruncate(fd, err => {
                if (!err) {
                    const stringData = JSON.stringify(data);
                    fs.writeFile(fd, stringData, err => {
                        if (!err) {
                            fs.close(fd, err => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback("Error closing file after writing to file");
                                }
                            })
                        } else {
                            callback("Error Writing to file while Updating.");
                        }
                    })
                } else {
                    callback("Error Truncating file while updating.");
                }
            })
        } else {
            callback("Error Opening  file for updation");
        }
    });
};


// Delete the file form the directory with file naem
lib.deleteFile = (dir, file, callback) => {
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
};


// Check whether file exist or not in the directory.
lib.isExist = (dir, file, callback) => {
    fs.access(`${lib.baseDir}${dir}/${file}/json`, fs.constants.F_OK, (err) => {
        // err ? notExist : exist
        !err ? callback(false) : callback(true);
    });
};

module.exports = lib;
