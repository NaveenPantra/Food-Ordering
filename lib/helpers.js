const queryString = require("querystring");
const https = require("https");
const crypto = require("crypto");

const config = require("./config");
const _data = require("./data");


const helpers = {};

helpers.parseJsonToObject = (data) => {
    let obj = {};
    try {
        obj = JSON.parse(data);
    } catch (err) {
        obj = {}
    }
    return obj;
};

helpers.hash = (data) => {
    if (data.trim().length > 0 && typeof(data) === "string") {
        return crypto.createHmac("sha256", config.hashKey).update(data).digest("hex");
    }
    return false;
};

helpers.inrToPrice = (cur, data) => {
    const prices = {
        usd: 0.014,
        gbp: 0.011,
        eur: 0.012,
        yen: 1.55,
        btc: 0.0000038,
    };

    // const symbol = {
    //     btc: "Ƀ",
    //     eur: "€",
    //     gbp: "£",
    //     yen: "¥",
    //     usd: "$",
    // };

    for (let key in data) {
        for (let item in data[key]) {
            data[key][item].itemCost = `${data[key][item].itemCost * prices[cur]}`;
            // console.log(data[key][item].itemPrice);
        }
    }
    return data;
};

helpers.getPrice = (cur, data) => {
    const prices = {
        usd: 0.014,
        gbp: 0.011,
        eur: 0.012,
        yen: 1.55,
        btc: 0.0000038,
        inr: 1,
    };
    return data * prices[cur];
};

helpers.insertMenuToItems = () => {
    _data.readFile("menu", "menu", (err, menuData) => {
        const items = {};
        if (!err && menuData) {
            for (let key in menuData) {
                for (let item in menuData[key]) {
                    items[`item-${item}`] = {
                        itemName: item.itemName,
                        itemCost: item.itemCost,
                        itemQunatity: item.itemQuantity,
                        categoryName: key,
                    }
                }
            }
            _data.updateFile("menu", "items", items, err => {
                if (!err) {
                    console.log("Successfully Updated the files");
                } else {
                    console.log("CCannot update file")
                }
            });
        } else {
            callback(err)
        }
    });
};

helpers.generateRandomString = (len = 20) => {
    const chars = "abcderghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const charsLength = chars.length;
    let ramdomString = "";
    let char = '';
    while (len >= 0) {
        char = chars.charAt(Math.floor(Math.random() * charsLength));
        ramdomString += char;
        len--;
    }
    return ramdomString;
};

helpers.sendOrderMail = (to, subject, text) => {
    to = typeof(to) === "string" && to.trim().length > 3 && to.trim().includes("@") && to.trim().includes(".") ? to.trim() : false;
    subject = typeof(subject) === "string" && subject.trim().length >= 5 ? subject.trim() : false;
    text = typeof(text) === "string" && text.trim().length > 10 ? text.trim() : false;

    if (to && subject && text) {
        const payload = {
            from: `Pizza Delivery <${config.mail.sandBoxMail}>`,
            to,
            subject,
            text,
        };
        const payloadString = queryString.stringify(payload);
        const requestDetails = {
            protocol: "https:",
            hostname: "api.mailgun.net",
            method: "POST",
            path: `/v3/${config.mail.interPath}.mailgun.org/messages`,
            auth: `api:${config.mail.api}`,
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
            },
        };
        const request = https.request(requestDetails, res => {
            const status = res.statusCode;
            if ([200, 201].indexOf(status) > -1) {
                console.log('\x1b[32m%s\x1b[0m', "Mail SUccess\n");
            } else {
                console.log("Mail Sending Failed")
            }
        });
        request.on("error", err => {
            console.log(err);
        });
        request.write(payloadString);
        request.end();
    } else {
        console.log('\x1b[31m%s\x1b[0m', "Sending Email failed.");
    }
};

helpers.completePayment = (amount, description, currency = "inr", source = "tok_visa", callback) => {
    amount = typeof(amount) === "number" && amount > 0 ? amount : false;
    description = typeof(description) === "string" && description.trim().length >= 1 ? description.trim() : false;
    currency = ["inr", "usd", "eur", "gbp", "yen"].indexOf(currency) > -1 ? currency : false;
    source = typeof(source) === "string" && source.trim().length > 3 ? source.trim() : "tok_visa";
    console.log(amount, description, currency, source);
    if (amount && description && currency && source) {
        const payload = {
            amount,
            description,
            currency,
            source,
        };
        const payloadString = queryString.stringify(payload);
        const requestDetails = {
            protocol: "https:",
            host: "api.stripe.com",
            path: "/v1/charges",
            method: "POST",
            auth: "sk_test_1YuqtAdlWLrmKAj7KXmjulIE",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(payloadString),
                "Authorization": "Bearer sk_test_1YuqtAdlWLrmKAj7KXmjulIE",
            }
        };
        const request = https.request(requestDetails, res => {
            if ([200, 201].indexOf(res.statusCode) > -1) {
                callback(false);
            } else {
                callback(`Status code received ${res.statusCode}`)
            }
        });
        request.on("error", err => {
            callback(`Error while sending request to stripe payment gateway.`);
        });
        request.write(payloadString);
        request.end();
    } else {
        callback("Missing required fileds for making payment");
    }
};


/*
 * MailGun API vall
 * Respond with status code 200 / 201 if the message transfor is success
 * Respond with other status if message/mail is not sent
 *

curl -s --user 'api:ca6485d8749376b91f83fddefd4928da-1b65790d-fb3cd55d' \
    https://api.mailgun.net/v3/sandbox17390a1bfde249ddac76a519c38310f7.mailgun.org/messages \
    -F from='Mailgun Sandbox <postmaster@sandbox17390a1bfde249ddac76a519c38310f7.mailgun.org>' \
    -F to='Naveen Pantra <naveenpantra.np@gmail.com>' \
    -F subject='Hello Naveen Pantra' \
    -F text='Congratulations Naveen Pantra, you just sent an email with Mailgun!  You are truly awesome!'
*/


/*
 * Strip charge API call
 * Respond with json having field status:"scuceeded"
 * Respond with josn if fial with only one field "error": {...}

    curl https://api.stripe.com/v1/charges \
     -u sk_test_1YuqtAdlWLrmKAj7KXmjulIE: \
     -d amount=999 \
     -d currency=usd \
     -d description="Example charge" \
     -d source=tok_visa


  - Testing tokens strip

    tok_visa	Visa
    tok_visa_debit	Visa (debit)
    tok_mastercard	Mastercard
    tok_mastercard_debit	Mastercard (debit)
    tok_mastercard_prepaid	Mastercard (prepaid)
    tok_amex	American Express
    tok_discover	Discover
    tok_diners	Diners Club
    tok_jcb	JCB
    tok_unionpay	UnionPay

 */

// Strip payments api
// _data.isExist("menu", "items", err => console.log(err));

module.exports = helpers;