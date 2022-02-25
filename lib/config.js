// This file contain all the configuration needed for the server


// Mailgun credentials
const mailgunCredentials = {
    api: "<mailgunAPIKey>",
    interPath: "<sandboxName>",
    sandBoxMail: "<sandboxMailAddress>",
};


// Strip credentials
const stripCredentials = {
    secreteKey: "<stripeSecreteKey>",
    publishableKey: "<stripePublishableKey>",
};


// Development environment
const development = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: "development",
    mail: mailgunCredentials,
    hashKey: "developmentKey",
    stripCredentials,
};


// Productionn Environment
const production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: "production",
    mail: mailgunCredentials,
    hashKey: "productionKey",
    stripCredentials,
};

// Getting Finding the evnironment provide form commandline
const currentEnv = typeof(process.env.NODE_ENV) === "string" ? process.env.NODE_ENV.trim() : "development";
const env = currentEnv === development.envName ? development : production;

module.exports = env;
