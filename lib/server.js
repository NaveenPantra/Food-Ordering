const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

const config = require("./config");
const handlers = require("./handlers");
const helpers = require("./helpers");


const server = {};

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

server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

server.unifiedServer = (req, res) => {
    const parsedURL = url.parse(req.url, true);
    const trimmedPath = parsedURL.pathname.replace(/^\/+|\/+$/g, '');
    const queryString = parsedURL.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder("utf-8");
    let buffer = "";
    req.on("data", data => {
       buffer += decoder.write(data);
    });
    req.on("end", () => {
        buffer += decoder.end();

        const choosenHandler = typeof(server.routes[trimmedPath]) !== "undefined" ? server.routes[trimmedPath] : server.routes.notFound;
        const data = {
            trimmedPath,
            queryString,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer),
        };

        choosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) === "number" ? statusCode : 200;
            payload = typeof(payload) === "object" ? payload : {};
            payload = JSON.stringify(payload);
            // res.setHeader("Set-Cookie", ["session=asdf;Domain=localhost;path=/;HttpOnly=true;Secure=true"]);
            // res.removeHeader("Set-Cookie");
            res.setHeader("Content-Type", "application/json");
            res.writeHeader(statusCode);
            res.end(payload, "\n")
        });
    });
};


server.httpServer = http.createServer(server.unifiedServer);
server.httpsServer = https.createServer(server.httpsServerOptions, server.unifiedServer);

server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        console.log("\x1b[35m%s\x1b[0m", `Server @ ${config.envName} listening on port ${config.httpPort}`);
    });
    server.httpsServer.listen(config.httpsPort, () => {
        console.log("\x1b[36m%s\x1b[0m", `Server @ ${config.envName} listening on port ${config.httpsPort}`);
    })
};


module.exports = server;