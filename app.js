
// Dependencies
const server = require("./lib/server");


const app = {};

app.init = () => {

    // Initiliazing server in ./lib/server
  server.init()
};

app.init();

module.exports = app;

