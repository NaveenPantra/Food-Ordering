// This file contain all the configuration needed for the server

const mailgunCredentials = {
    api: "ca6485d8749376b91f83fddefd4928da-1b65790d-fb3cd55d",
    interPath: "sandbox17390a1bfde249ddac76a519c38310f7",
    sandBoxMail: "postmaster@sandbox17390a1bfde249ddac76a519c38310f7.mailgun.org",
};

const stripCredentials = {
    secreteKey: "sk_test_1YuqtAdlWLrmKAj7KXmjulIE",
    publishableKey: "pk_test_OLZsjHVs2O51SgTBzUK3C2QC",
};

const development = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: "development",
    mail: mailgunCredentials,
    hashKey: "developmentKey",
    stripCredentials,
};

const production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: "production",
    mail: mailgunCredentials,
    hashKey: "productionKey",
    stripCredentials,
};

const currentEnv = typeof(process.env.NODE_ENV) === "string" ? process.env.NODE_ENV.trim() : "development";

const env = currentEnv === development.envName ? development : production;

module.exports = env;