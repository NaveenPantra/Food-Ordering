// Node dependencies
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

// Internal fiel dependencies
const config = require("./config");
const handlers = require("./handlers");
const helpers = require("./helpers");


const server = {};

// routs will have the path the server has valid handlers
server.routes = {
    ping: handlers.ping,
    user: handlers.user,
    login: handlers.login,
    logout: handlers.logout,
    menu: handlers.menu,
    order: handlers.order,
    payment: handlers.payment,
    notFound: handlers.notFound,
};


// Fro HTTPS support we have to add key.pem and cert.pem
server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

// This Method will get the detais of the request and pass them to the handlers
server.unifiedServer = (req, res) => {

    // Parsing the URL
    const parsedURL = url.parse(req.url, true);

    // Trimmend Path (i.e path after the URL)
    const trimmedPath = parsedURL.pathname.replace(/^\/+|\/+$/g, '');

    // Query string (i.e ?name=)
    const queryString = parsedURL.query;

    // THe requesting menthod
    const method = req.method.toLowerCase();

    // The headers on the request
    const headers = req.headers;

    // The decoder is set because of the body reveiving
    const decoder = new StringDecoder("utf-8");
    let buffer = "";

    // while data form the body is received the this method is invoked
    req.on("data", data => {
       buffer += decoder.write(data);
    });

    // When data is ended then this methid is invoked
    req.on("end", () => {
        buffer += decoder.end();

        // Choose the handler based on the path choosen if invalid path then direct to notFound handler
        const choosenHandler = typeof(server.routes[trimmedPath]) !== "undefined" ? server.routes[trimmedPath] : server.routes.notFound;

        // constructing data object that contain all the detils about the request
        const data = {
            trimmedPath,
            queryString,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer),
        };

        // Invoding choosend handler to handle the request
        choosenHandler(data, (statusCode, payload) => {
            // status for the response
            statusCode = typeof(statusCode) === "number" ? statusCode : 200;

            // body of the response
            payload = typeof(payload) === "object" ? payload : {};

            // This API send every data as json so converting
            payload = JSON.stringify(payload);
            // res.setHeader("Set-Cookie", ["session=asdf;Domain=localhost;path=/;HttpOnly=true;Secure=true"]);
            // res.removeHeader("Set-Cookie");

            // Setting the Content-Type of the respense
            res.setHeader("Content-Type", "application/json");

            // Writing header
            res.writeHeader(statusCode);

            // Sending the data
            res.end(payload, "\n")

            // Done with request
        });
    });
};


// Creating server for both httpServer and httpsSerer using unified server
server.httpServer = http.createServer(server.unifiedServer);
server.httpsServer = https.createServer(server.httpsServerOptions, server.unifiedServer);


// Initinizing the server by listening on the ports from config file ( i.e development / production ).
server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        console.log("\x1b[35m%s\x1b[0m", `Server @ ${config.envName} listening on port ${config.httpPort}`);
    });
    server.httpsServer.listen(config.httpsPort, () => {
        console.log("\x1b[36m%s\x1b[0m", `Server @ ${config.envName} listening on port ${config.httpsPort}`);
    })
};


module.exports = server;