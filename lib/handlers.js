const _data = require("./data");
const helpers = require("./helpers");

const handler ={};


// For checking is server is alive
handler.ping = (data, callback) => {
    // console.log("\x1b[32m%s\x1b[0m", `SERVER: 200, ${data.trimmedPath}`);
    callback(200, {msg: "server alive"});

};

// IF any appropiate path or method requested to server then norFound will be responded.
handler.notFound = (data, callback) => {
    // console.log("\x1b[31m%s\x1b[0m", `SERVER: 404, ${data.trimmedPath}`);
    callback(404, {err: `Server has no route`, method: data.method, path: data.trimmedPath});
};




// User
handler.user = (data, callback) => {
  if (["get", "post", "put", "delete"].indexOf(data.method) > -1) {
        handler._user[data.method](data, callback);
  } else {
      handler.notFound(data, callback);
  }
};

handler._user = {};

/*
 * GET - /user,
 * This request return the user details,
 * Required Data (to be sent as text)
 *  - email (one should be already registered)
 * Optional Data - None.
*/
handler._user.get = (data, callback) => {
    const email = typeof(data.queryString.email) === "string" && data.queryString.email.trim().length > 5 ? data.queryString.email.trim() : false;
    if (email) {
        // Check if the requested user is valid user
        _data.isExist("users", email, exist => {
           if (exist) {
               // Read data of the user form .data/users/<email>.json
               _data.readFile("users", email, (err, userData) => {
                  if (!err && userData) {
                      delete userData.password;
                      callback(200, {msg: "success", data: userData});
                  } else {
                      callback(500, {err: "Internal Server Error reading the data of the user"});
                  }
               });
           } else {
               callback(404, {err: `User with email: ${email} not found`});
           }
        });
    } else {
        callback(404, {err: `Required data missing.`});
    }
};

/*
 * POST - /user,
 * This request register the user,
 * Required Data (to be sent as text)
 *  - username
 *  - password
 *  - fullname
 *  - address,
 * Optional Data - None.
*/
handler._user.post = (data, callback) => {

    // Required details for registrarion
    const email = typeof(data.payload.email) === "string" && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
    const password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 5 ? data.payload.password.trim() : false;
    const fullname = typeof(data.payload.fullname) === "string" && data.payload.fullname.trim().length > 5 ? data.payload.fullname.trim() : false;
    const address = typeof(data.payload.address) === "string" && data.payload.address.trim().length > 10 ? data.payload.address.trim() : false;

    // Verifying all the details are received or not.
    if (email && password && fullname && address) {

        // Checking if user already exist or not
        _data.isExist("users", email, err => {
            if (err) {

                // Custructing the usre details by hashing the password using `key-based` hashing
                const data = {
                    email,
                    password: helpers.hash(password),
                    fullname,
                    address,
                    tokens: [],
                    orders: [],
                };
                if (data.password) {

                    // Creating the user file
                    _data.createFile("users", email, data, (err) => {
                        if (!err) {
                            delete data.password;
                            delete data.tokens;
                            delete data.orders;
                            callback(200, {msg: "User successfully registered", data});
                        } else {
                            callback(500, {err: "Internal Server Error creating user failed."});
                        }
                    });
                } else{
                    callback(500, {err: "Internal Server Error Hashing Passowrd"});
                }
            } else {
                callback(400, {err: `User with email ${email} already exist`});
            }
        });
    } else {
        callback(400, {err: "Required fileds are missing to register user."});
    }

};

/*
 * PUT - /user,
 * This request Update the user,
 * Required Data (to be sent as text)
 *  - email
 *  - password
 * Optional Data - email, password, fullname, address.
*/
handler._user.put = (data, callback) => {

    // Optional details for request
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 5 ? data.payload.password.trim() : false;
    let fullname = typeof(data.payload.fullname) === "string" && data.payload.fullname.trim().length > 5 ? data.payload.fullname.trim() : false;
    let address = typeof(data.payload.address) === "string" && data.payload.address.trim().length > 10 ? data.payload.address.trim() : false;

    // checking if either one of them is present
    if (password || fullname || address) {

        // Getting token from header
        const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length >= 20 ? data.headers.token.trim() : false;

        // Checking for valid token
        _data.isExist("tokens", tokenID, err => {
            if (err) {

                // If token is valid then read the data from file
                _data.readFile("tokens", tokenID, (err, tokenData) => {
                    if (!err && tokenData) {
                        _data.readFile("users", tokenData.email, (err, userData) => {
                            if (!err && userData) {
                                userData.fullname = fullname || userData.fullname;
                                userData.address = address || userData.address;
                                userData.password = helpers.hash(password) || userData.password;

                                // Updading the .data/users/<email>.json file after updating
                                _data.updateFile("users", userData.email, userData, err => {
                                   if (!err) {
                                       delete userData.password;
                                       delete userData.orders;
                                       delete userData.tokens;
                                       const msg = `User data successfully ${password ? "and password" : ""} updated\n Email: ${userData.email}\n Full Name: ${userData.fullname}\n Address: ${userData.address}`;
                                       helpers.sendOrderMail(`${userData.email}`, "User Data Updated", msg);
                                       callback(200, {msg: "successfully Updated the user data", userData: userData});
                                   } else {
                                       callback(500, {msg: "Internal server error while updating data", err});
                                   }
                                });

                            } else {
                                callback(500, {msg: "Internal server error while reading user data", err});
                            }
                        });
                    } else {
                        callback(500, {msg: "Internal server error while reading token data", err});
                    }
                });
            } else {
                callback(400, {err: "Token ID sent dosent match any records in the server"});
            }
        });
    } else {
        callback(400, {err: "Atleast one filed is required to update the user"});
    }
};

/*
 * DELETE - /user,
 * This request DELETE the user and related information (i.e user tokens, user orders if they are status 0),
 *      - cannot delete the  oder status of 1 because is the revenue of the company
 * Required Data (to be sent as text)
 *  - email
 *  - password
 * Optional Data - email, password, fullname, address.
*/
handler._user.delete = (data, callback) => {

    //  Required Details
    const email = typeof(data.payload.email) === "string" && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 5 ? data.payload.password.trim() : false;

    // checking the details are provided or not
    if (email && password) {

        // Reading the usre data  to store the user data into .data/pastUsers/<email>.json and to validate the password
        _data.readFile("users", email, (err, userData) => {
            if (!err && userData) {

                // Validating the password
                password = helpers.hash(password);
                if (userData.password === password) {

                    // Deleting all the tokens related to the user
                    for (let tokenID of userData.tokens) {
                        _data.deleteFile("tokens", tokenID, err => {
                            if (err) {
                                callback(500, {msg: "Internal server error while deleting token file", err});
                            }
                        });
                        userData.tokens.splice(userData.tokens.indexOf(tokenID), 1);
                    }

                    // Deleting all the orderdata with orderStatus as 0 from the user data
                    for (let orderID of userData.orders) {
                        _data.readFile("orders", orderID, (err, orderData) => {
                            if (!err && orderData) {
                                if (orderData.orderStatus === 0) {
                                    _data.deleteFile("orders", orderID, err => {
                                        if (err) {
                                            callback(500, {msg: "internal server error while deleting order file", err});
                                        }
                                    });
                                    userData.orders.splice(userData.orders.indexOf(orderID), 1);
                                }
                            } else {
                                callback(500, {msg: "internal server error while reading one of the order file", err});
                            }
                        });
                    }

                    // Writing the data into new file in .data/pastUsers/<email>.json
                    _data.createFile("pastUsers", email, userData, err => {
                        if (!err) {

                            // Deleting the user file in .data/users/<email>.json
                            _data.deleteFile("users", email, err => {
                                if (!err) {
                                    const msg = "Good bye greatful to serve you";
                                    helpers.sendOrderMail(email, "Good Bye", msg);
                                    callback(200, {msg: "User succefully deleted."});
                                } else {
                                    callback(500, {msg: "internal server error while deleting the usrfile", err})
                                }
                            })
                        } else {
                            callback(500, {msg: "Internal server error while creating the pastUser file.", err});
                        }
                    });

                } else {
                    callback(404, {err: "User credentials not matched."});
                }
            } else {
                callback(404, {msg: "User not found", err});
            }
        });
    } else {
        callback(400, {err: "Requied fileds are missing"});
    }
};




// Login
handler.login = (data, callback) => {
    if (["post"].indexOf(data.method) > -1) {
        handler._login[data.method](data, callback);
    } else {
        handler.notFound(data, callback);
    }
};

handler._login = {};

/*
 * POST - /login,
 * This request return the tokenID of the user,
 * Required Data (to be sent as text)
 *  - email (one should be already registered)
 *  - password
 * Optional Data - None.
*/
handler._login.post = (data, callback) => {

    // Required data for login
    let email = typeof(data.payload.email) === "string" && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 5 ? data.payload.password.trim() : false;

    // Confirming all the details are provided
    if (email && password) {

        // Checking for the email exist or not
        _data.isExist("users", email, exist => {
            if (exist) {

                // Read the data in the .data/users/<email>.json for password
                _data.readFile("users", email, (err, userData) => {
                    if (!err && userData) {

                        // Hashing the password before comparing
                        password = helpers.hash(password);

                        // COmparing the password and user orginal Password
                        if (password === userData.password) {
                            const tokenID = helpers.generateRandomString();
                            const tokenData = {
                                tokenID,
                                email,
                            };

                            // Creating the token file for the user
                            _data.createFile("tokens", tokenID, tokenData, (err) => {
                                if (!err) {
                                    _data.readFile("users", email, (err, userData) => {
                                        let tokens = userData.tokens;
                                        tokens.push(tokenID);
                                       if (!err && userData) {
                                           const newUserData = {
                                               email: userData.email,
                                               password: userData.password,
                                               fullname: userData.fullname,
                                               address: userData.address,
                                               orders: userData.orders,
                                               tokens,
                                           };

                                           // Updting the user file with the newly created token.
                                           _data.updateFile("users", newUserData.email, newUserData, err => {
                                               if (!err) {
                                                    callback(200, {msg: "User Authorizes", tokenID, email});
                                               } else {
                                                   callback(500, {err: "Internal Server Error while inserting token data to user file."});
                                               }

                                           })
                                       } else {
                                           callback(500, {err: "Internal Server Error While reading inserting token to user file."});
                                       }
                                    });
                                } else {
                                    callback(500, {err: "Internal Server error while creating token"});
                                }
                            });
                            // callback(200, {msg: "User successfully logged in"});
                        } else {
                            callback(404, {err: "Cannot find the user with sent credentials."});
                        }
                    } else {
                        callback(500, {err: "Internal server error while reading file."});
                    }
                });
            } else {
                callback(404, {err: "Cannot find the user with sent credentials."});
            }
        });
    } else {
        callback(400, {err: "Required fields are missing."});
    }
};





// Logout
handler.logout = (data, callback) => {
    if (["get"].indexOf(data.method) > -1) {
        handler._logout[data.method](data, callback);
    } else {
        handler.notFound(data, callback);
    }
};

handler._logout = {};

/*
 * GET - /logout,
 * This request will delete the token form the user file and also delete the token file,
 * Required Data (to be sent as text)
 *  - token (in header)
 * Optional Data - None.
*/
handler._logout.get = (data, callback) => {

    // Required data
    const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length > 20 ? data.headers.token.trim() : false;
    if (tokenID) {

        // Checking for token exist
        _data.isExist("tokens", tokenID, exists => {
            if (!exists) {

                // Reading the token data for email of the user
                _data.readFile("tokens", tokenID, (err, tokenData) => {
                    if (!err && tokenData) {
                        const tokenEmail = tokenData.email;

                        // reading the user file for deleting the token form the userdata.
                        _data.readFile("users", tokenEmail, (err, userData) => {
                            if (!err && userData) {
                                userData.tokens.splice(userData.tokens.indexOf(tokenID), 1);
                                const newUserData = {
                                    email: userData.email,
                                    password: userData.password,
                                    fullname: userData.fullname,
                                    address: userData.address,
                                    orders: userData.orders,
                                    tokens: userData.tokens,
                                };

                                // Updadte the user after deleting the  token data form user file
                                _data.updateFile("users", userData.email, newUserData, err => {
                                    if (!err) {

                                        // Deleting the token file related to the user
                                        _data.deleteFile("tokens", tokenID, err => {
                                            if (!err) {
                                                callback(200, {err: "Succefully deleted token"});
                                            } else {
                                                callback(500, {err: "Internal Server Error while deleting token file"});
                                            }
                                        })
                                    } else {
                                        callback(500, {err: "Intenal Server Error while updating user token data"});
                                    }
                                })

                            } else {
                                callback(500, {err: "Internal server error while reading user data."});
                            }
                        });
                    } else {
                        callback(500, {err: "Internal server error while reading token data"});
                    }
                });
            } else {
                callback(404, {err: `token with id ${tokenID} not a valid token`});
            }
        });
    } else {
        callback(400, {err: "No token present in header"});
    }
};




// Menu
handler.menu = (data, callback) => {
    if (["get"].indexOf(data.method) > -1) {
        handler._menu[data.method](data, callback);
    } else {
        handler.notFound(data, callback);
    }
};

handler._menu = {};

/*
 * GET - /menu,
 * This request return the menu for the authorized user,
 * Required Data (to be sent as text)
 *  - token (in header)
 * Optional Data - None.
*/
handler._menu.get = (data, callback) => {

    // Required and optional details
    const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length > 20 ? data.headers.token.trim() : false;
    const cur = typeof(data.queryString.cur) === "string" && data.queryString.cur.trim().length > 1 && ["inr", "eur", "gbp", "yen", "btc"].indexOf(data.queryString.cur.trim())? data.queryString.cur.trim() : "inr";
    if (tokenID) {

        // Reading token file for validation if it is valid toekn or not. This also can be done with
        _data.readFile("tokens", tokenID, (err, tokenData) => {
            if (!err && tokenData) {

                // Reading data form .data/menu/menu.json for menu details
                _data.readFile("menu", "menu", (err, menuData) => {
                    if (!err && menuData) {
                        let updatedMenuData = menuData;
                        if (cur !== "inr") {

                            // Changing the currency of the requested price of the menu
                            updatedMenuData = helpers.inrToPrice(cur, menuData);
                        }
                        callback(200, {msg: "Successfully Fetched Menu details", menu: updatedMenuData});
                    } else {
                        callback(500, {err: "Internal Server Error while fetching menu."});
                    }
                });
            } else {
                callback(400, {err: "User cannot be authorized as token is invalid"});
            }
        });
    } else {
        callback(400, {err: "User not authorized. No token present in header"});
    }
};




// Orders
handler.order = (data, callback) => {
    if (["post", "get",].indexOf(data.method) > -1) {
        handler._order[data.method](data, callback);
    } else {
        handler.notFound(data, callback);
    }
};

handler._order = {};

/*
 * POST - /order,
 * This request return the order for the authorized user,
 * Required Data (to be sent as text)
 *  - token (in header)
 *  - order (in query string)
 *  - item ids in array form body
 * Optional Data - None.
*/
handler._order.post = (data, callback) => {

    // Required details and optional details
    const items = typeof(data.payload.items) === "object" && data.payload.items.length >= 1 ? data.payload.items: false;
    const cur = typeof(data.queryString.cur) === "string" && data.queryString.cur.trim().length > 1 && ["inr", "eur", "gbp", "yen", "btc"].indexOf(data.queryString.cur.trim())? data.queryString.cur.trim() : "inr";
    if (items) {

        // Getting token form headers
        const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length > 20 ? data.headers.token.trim() : false;
        if (tokenID) {

            // Reading the token data
            _data.readFile("tokens", tokenID, (err, tokenData) => {
                if (!err && tokenData) {

                    // Reading the items data form .data/menu/items.json to find the items based on itemid
                    _data.readFile("menu", "items", (err, itemsData) => {
                        if (!err && itemsData) {

                            // Buldig up the order data.
                            const orderData = {
                                email: tokenData.email,
                                cur,
                                orderID: helpers.generateRandomString(),
                                items: {},
                                orderStatus: 0,
                            };
                            let orderItems = 0;
                            let orderCost = 0;
                            const incorrectItems = [];

                            // Iterating for updation of the price and also to find which are not valid (i.e incorrect itemid)
                            for (let itemID of items) {
                                if (itemsData[itemID]) {
                                    orderData.items[itemID] = itemsData[itemID];
                                    orderData.items[itemID].itemCost = helpers.getPrice(cur, orderData.items[itemID].itemCost);
                                    orderItems++;
                                    orderCost += Number(orderData.items[itemID].itemCost);
                                } else {
                                    incorrectItems.push(itemID);
                                }
                            }

                            // if atleast one orderitem is correct  then it is valid.
                            if (orderItems) {
                                orderData["orderItems"] = orderItems;
                                orderData["orderCost"] = orderCost;

                                // Creding file for order for the user with respective email email
                                _data.createFile("orders", orderData.orderID, orderData, err => {
                                    if (!err) {

                                        // Sending mail about the order with orderid by using `www.mailgun.com`
                                        helpers.sendOrderMail(orderData.email, "Order Details", `Your order palced successfully for further details refer orderid ${orderData.orderID}`);
                                        callback(200, {msg: "Order successufully Placed", orderData: orderData, incorrectItems});
                                    } else {
                                        callback(500, {msg: "Internal Server Error while creating order", err});
                                    }
                                })
                            } else {
                                callback(400, {msg: "The Items requested are all incorrect", incorrectItems});
                            }
                        } else {
                            callback(500, {msg: "Internal server error while reading items data.", err});
                        }
                    });
                } else {
                    callback(404, {msg: `Token with id ${tokenID} cannot be resolved.`, err});
                }
            })
        }
    } else {
        callback(400, {err: `Item should be send through Array in body`, items});
    }
};

/*
 * GET - /order,
 * This request return the order for the authorized user,
 * Required Data (to be sent as text)
 *  - token (in header)
 *  - order in header
 * Optional Data - None.
*/
handler._order.get = (data, callback) => {

    // getting tokenID form header
    const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length >= 20 ? data.headers.token.trim() : false;
    if (tokenID) {
        // Reading toke data to find it exist or not and also read the data
        _data.readFile("tokens", tokenID, (err, tokenData) => {
            if (!err && tokenData) {

                // Getting orderID from header
                const orderID = typeof(data.headers.order) === "string" && data.headers.order.trim().length >= 20 ? data.headers.order.trim() : false;
                if (orderID) {

                    // Reading the order data based onth orderID
                    _data.readFile("orders", orderID, (err, orderData) => {
                        if (!err && orderData) {

                            // The order data is deleveired only to the valid user (i.e the user who created order and logging in user must be same)
                            if (tokenData.email === orderData.email) {
                                callback(200, {msg: `Successfylly fetched order data`, orderData: orderData});
                            } else {
                                callback(404, {msg: `Relation between token ${tokenID} and order ${orderID} not found`});
                            }
                        } else {
                            callback(400, {msg: `sent order is invalid ${orderID}`, err});
                        }
                    });
                } else {
                    callback(400, {err: `sent order is invalid or not present ${orderID}`});
                }
            } else {
                callback(404, {msg: `Sent token is invalid ${tokenID}`, err});
            }
        });
    } else {
        callback(400, {err: `Sent token is invalid ${tokenID} or not present`});
    }
};




// Payment
handler.payment = (data, callback) => {
    if (["get", "post"].indexOf(data.method) > -1) {
              handler._payment[data.method](data, callback);
    } else {
        handler.notFound(data, callback);
    }
};

handler._payment = {};

/*
 * post - /payment,
 * This request return the successful payment for the order,
 * Required Data (to be sent as text)
 *  - token ( in header )
 *  - order ( in header )
 *  - amount        |
 *  - currency      | - - -> To be sent through
 *  - description   | - - -> the body as json.
 *  - source        |
 * Optional Data - None.
*/
handler._payment.post = (data, callback) => {

    // Getting tokenID from header
    const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length > 20 ? data.headers.token.trim() : false;

    // Reading tokendata of the tokenID
    _data.readFile("tokens", tokenID, (err, tokenData) => {
        if (!err && tokenData) {

            // Getting order data form orderID provied in header
            const orderID = typeof(data.headers.order) === "string" && data.headers.order.trim().length > 20 ? data.headers.order.trim() : false;
            _data.readFile("orders", orderID, (err, orderData) => {
                if (!err && orderData) {

                    // verifying for the valid user.
                    if (orderData.email === tokenData.email) {

                        // If order status is 0 then proceed to payment else this order has already been placed.
                        if (orderData.orderStatus === 0) {

                            // Complete the apyment with `www.strip.com`
                            helpers.completePayment(Math.ceil(orderData.orderCost), orderID, "usd", "tok_visa", (err) => {
                                if (!err) {

                                    // update order status to 1
                                    orderData.orderStatus = 1;

                                    // update order file
                                    _data.updateFile("orders", orderID, orderData, err => {
                                        if (!err) {

                                            // read the user data to update the user file with success order
                                             _data.readFile("users", orderData.email, (err, userData) => {
                                                if (!err && userData) {
                                                    userData.orders.push(orderData.orderID);

                                                    // Updating the user data file
                                                    _data.updateFile("users", userData.email, userData, err => {
                                                        if (!err) {

                                                            // Construct the payment data file
                                                            const paymentData = {
                                                                paymentID: helpers.generateRandomString(),
                                                                orderID,
                                                                emal: userData.email,
                                                                paymentPrice: orderData.orderCost,
                                                                currency: orderData.cur,
                                                            };

                                                            // Create payment file
                                                            _data.createFile("payments", paymentData.paymentID, paymentData, err => {
                                                                if (!err) {

                                                                    // Send mail ot the user wiht `www.mailgun.com`
                                                                    const msg = `Paymetnt Succefull refer\n payment id ${paymentData.paymentID}\n price: ${paymentData.paymentPrice}\n Currency: ${paymentData.currency}`;
                                                                    helpers.sendOrderMail(orderData.email, "Payment Details", `Thanks for Dining with up \n ${msg}`);
                                                                    callback(200, {msg: "payment successfull", payment: paymentData});
                                                                } else {
                                                                    callback(500, {msg: "Internal server while creating payment info fils"});
                                                                }
                                                            })
                                                        } else {
                                                            callback(500, {msg: `Internal server error while updating user file ${userData.email}`, err})
                                                        }
                                                    });
                                                } else {
                                                    callback(500, {msg: `Internal server error while reading userdata ${orderData.email}`, err});
                                                }
                                            });
                                        } else {
                                            callback(500, {msg: `Internal server errror while updating order ${orderID}`, err});
                                        }
                                    });
                                } else {
                                    callback(400, {msg: "making paymet failed.", err});
                                }
                            })
                        } else {
                            callback(400, {msg: "Order already paidoff"});
                        }
                    } else {
                        callback(400, {err: "Order cannot be related to token sent"});
                    }
                } else {
                    callback(400, {msg: "Sent order data not found", err});
                }
            });
        } else {
            callback(400, {msg: "sent token data not found", err})
        }
    });
};

/*
 * GET - /payment,
 * This request return the order for the authorized user,
 * Required Data (to be sent as text)
 *  - token (in header)
 *  - payment (in header)
 * Optional Data - None.
*/
handler._payment.get = (data, callback) => {
    // Getting tokenID from the header
    const tokenID = typeof(data.headers.token) === "string" && data.headers.token.trim().length > 20 ? data.headers.token.trim() : false;

    // Read the data from tokenfile
    _data.readFile("tokens", tokenID, (err, tokenData) => {
        if (!err && data) {

            // Get the paymentID from the header
            const paymentID = typeof(data.headers.payment) === "string" && data.headers.payment.trim().length > 20 ? data.headers.payment.trim() : false;

            // Read the payment data
            _data.readFile("payments", paymentID, (err, paymentData) => {
                if (!err && paymentData) {

                    // Validate the payment data with the token data for vaid user
                    if (paymentData.email === tokenID.email) {
                        callback(200, {msg: "Succefully fetched Payment details", paymentData: paymentData});
                    }
                } else {
                    callback(400, {msg: "Payment id not found."});
                }
            });
        } else {
            callback(400, {msg: "Token id not found."});
        }
    });
};

module.exports = handler;