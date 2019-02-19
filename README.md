# Food-Ordering
A Pure **nodeJS** application, No _npm package_ used used.

This application use only file system to store the data.

### step - 1
###### User Registration
This Request register the user with the provided credentials and return appropriate response if user is already registered or if the fields are invalid

- path: `/user`
- method: `POST`
- Required Data: `email`, `fullname`, `password`, `address` to be sent via body of the request as `application/json`
- Optional Data: `none`
- Response - `application/json` data containing user  registration successful or not.

The user data is stored in file `.data/users/<email>.json`, this file also stores `ordersID`'s user have been ordered until now and `tokenID`'s the user created. 
Storing this information helps when deleting the user so we can delete the `token` files and `order` files related to the user. 
But the `order` files do not delete if the payment of the order has been completed. Only `order` files which are pending to pay only be deleted.

The UserData in the file, file name as `<email>.json`
```json
{
  "emal": "<email>",
  "password": "<SHA256 encrypted password>",
  "fullname": "<fullname>",
  "orders" : ["...", "..."],
  "tokens": ["...", "..."]
}
``` 

### step - 2
###### Login / Token Generation

This request generate the unique token for the user with correct credentials provided. If incorrect credentials provided `err` is returned.

- path: `/login`
- method: `POST`
- Required Data: `email`, `password` to be sent via body of the request as `application/json`
- Optional Data: `none`
- Response - `application/json` data containing `tokenID`

The token data is stored in file `.data/tokens/<tokenID>.json`, this file stores `tokenID` and `email` of the user to whome the token belong to.
The token data is deleted if the user is deleted or if the user is logged out. The `tokenID` is pushed into the `tokens` array of the user data.


The token file name as `<tokenID>.json`
```json
{
  "tokenID": "<tokenID> length 20 chars",
  "email": "<email>"
}
```

### step - 3
###### Getting Menu
This request return the `menu` in `application/json` format for the validated `token` sent through header and `cur` as currency passes through the query string.

- path: `/menu`
- method: `GET`
- Required Data: `token` passed through header
- Optional Data: `cur` Passed through query string, if it's not passed the default is `inr`. Can be any one in this `inr`, `usd`, `gbp`, `yen`, `eur`.
- Response -`application/json` data containing the menu data

The menu is returned only for authorized user no other user can able to get the menu. 

The `Menu` response.
```json
{
  "msg": "<message>",
  "menu": {
    "<category Name>": {
      "<item name>": {
        "itemName": "<Item Name>",
        "itemCost": "<Item Cost> in integer as inr",
        "itemQuantity": "<int> grms/ml",
        "itemID": "<item ID>"
      }
    }
  }
}
```
There will be many `category name`'s and in each `category` there will be many `items name` as object that contain `item` details, `itemCost` is stored in `integer` format as `inr` currency.

### step - 4
###### order

This request will accept the valid `token`ID in header and itemID's in an array `items` in the body as `application/json` and an optional `currency` form querystring.

- path: `/order`
- Method: `POST`
- Required Data: `items` an array containing itemID's of the items
- Optional Data: `cur`  in query string but default to `inr` can be either `usd`, `inr`, `yen`, `eur`, `gbp`.

This will respond with  `application/json` which contain.
- `cur` - The currency specified default to `inr`.
- `orderStatus` - The status of the order `0` for waiting for payment `1` payment completed this is `integer`.
- `orderItems` - Number of items in the `order/cart`, only valid item are in the cart.
- `orderCost` - Total cost of the `order/cart`, only for valid items.
- `incorrectItems` - Array containing `itemID` of the incorrect `items` sent. This are not included in the `order` 
```json
{
    "orderData": {
        "email": "<email>",
        "cur": "<currency>",
        "orderID": "<orderID>",
        "items": {
            "<itemID>": {
                "itemName": "<Item Name>",
                "itemCost": "<Item Cost specified currency> (int)",
                "itemQuantity": "<item Qauntity> grms/ml",
                "categoryName": "<Category Name>"
            }
        },
        "orderStatus": "<0 or 1> (int)",
        "orderItems": "<Number of item in order/cart> (int)",
        "orderCost": "<total cost of the order in specified cur> (int)"
    },
    "incorrectItems": ["..."]
}
``` 

The `order` data is stored into file `.data/<orderID>.json` and filds are
- In this file `incorrectItems` are not saved as it is not required.
- If the payment is done then `orderStatus` is updated form `0` to `1`.

```json
{
    "email": "<email>",
    "cur": "<currency>",
    "orderID": "<orderID>",
    "items": {
        "<itemID>": {
            "itemName": "<Item Name>",
            "itemCost": "<Item Cost specified currency> (int)",
            "itemQuantity": "<item Qauntity> grms/ml",
            "categoryName": "<Category Name>"
        }
    },
    "orderStatus": "<0 or 1> (int)",
    "orderItems": "<Number of item in order/cart> (int)",
    "orderCost": "<total cost of the order in specified cur> (int)"
}
```

If the `orderStatus` is changed to `1` then the `orders` field in `users data` pushed with `orderID`.
The mail is sent to the `email` about the order details.

### Step - 5
###### Payment
This Request will accept the valid `token`ID and `order`ID in header. If payment is unsuccessfull then it return `err` if successful then `paymentID` is received.
- Path - `/payment`
- Method - `POST`
- Required Data - `token`, `order` Id's in the header of the request.
- Optional Data - `none`

This request respond with `application/json` content
```json
{
    "payment": {
        "paymentID": "<PaymentID>",
        "orderID": "<orderID>",
        "emal": "<email>",
        "paymentPrice": "<total amount paid via payment in specified cur> (int)",
        "currency": "<currency>"
    }
}
```

The payment data is stored into the `.data/payments/<paymentID>.json` and data is
```json
{
    "paymentID": "<PaymentID>",
    "orderID": "<orderID>",
    "emal": "<email>",
    "paymentPrice": "<total amount paid via payment in specified cur> (int)",
    "currency": "<currency>"
}
```

Mail is sent to the `email` of the user about the payment information.

## Other Mehtods

###### Get user details
This Request will accept `email` of the user and return the user ingo
- Path - `/user`
- Method - `GET`
- Required Data - `email` 
- Optional Data - `none`

The response will be in `application/json`  
```json
{
    "data": {
        "email": "<email>",
        "fullname": "<Full Name>",
        "address": "Address of the User",
        "orders": [
            "..."
        ],
        "tokens": [
            "..."
        ]
    }
}
```
###### Update User Details
This Request will update the `user details`

- Path - `/user`
- Method - `PUT`
- Required Data - `token` 
- Optional Data - `email`, `fullname`, `address`, `password` atleast one should be provided.

The response will be in `application/json` will return the updated details of the `user detils`
```json

```

###### Delete the user
This request will delete `usre details`

- Path - `/user`
- Method - `DELETE`
- Required Data - `token` 
- Optional Data - `none`.

This request will delete the user details and related `tokens` and `order` details are also deleted (`order` with `orderStatus` `0` are only deleted). 

The response will be `application/json` will return the `err` or success of the `msg`.

###### Logout / Delete token
This request will delete the `token` of the user.

- Path - `/logout`
- Method - `GET`
- Required Data - `token` in header 
- Optional Data - `none`.

This request will delete the `token` if it is valid an also delete `token` form the list of the `tokens` in the user data also.
Return `success` or `err` if `token` is not deleted.

###### Get Order Details

This Requst will return the order details for the specified `token` and `order` if they are matched (i.e both should belong to same user).


- Path - `/order`
- Method - `GET`
- Required Data - `token`, `order`  ID's in header 
- Optional Data - `none`.

This request will return the order details for the specified order in  `application/json`

```json
{
    "msg": "Successfylly fetched order data",
    "orderData": {
        "email": "<email>",
        "cur": "<currency>",
        "orderID": "<orderID>",
        "items": {
            "<itemID>": {
                "itemName": "<Item Name>",
                "itemCost": "<Item Cost specified currency> (int)",
                "itemQuantity": "<item Qauntity> grms/ml",
                "categoryName": "<Category Name>"
            }
        },
        "orderStatus": "<0 or 1> (int)",
        "orderItems": "<Number of item in order/cart> (int)",
        "orderCost": "<total cost of the order in specified cur> (int)"
    }
}
```

###### Get Payment Details

This request will return the payment details for the specified `token`, `order`, `payment` ID's. 
This will only return the correct details if they belong to the same user.

- Path - `/payment`
- Method - `GET`
- Required Data - `token`, `order`, `payment`  ID's in header 
- Optional Data - `none`.

The Response will be in `application/json` format
```json
{
    "paymentData": {
        "paymentID": "<PaymentID>",
        "orderID": "<orderID>",
        "emal": "<email>",
        "paymentPrice": "<total amount paid via payment in specified cur> (int)",
        "currency": "<currency>"
    }
}
```


## NOTES

###### Deleting User

- By deleting the user the `payment` details `order` details with `orderStaus` are not deleted as they required for the review in future for payment details.
- The deleted user data will be stored in `.data/pastUsers/<email>.json` now this will contain `orders` those with `orderStatus` as `1`'
- By this data is persistance will be maintained for the `payments` and `orders` for the user. 

###### Payment Gateway
- [Stripe](https://www.stripe.com) is used as the payment gate way on test data.

###### Mail Agent
- [MailGun](https://www.mailgun.com) is used as the Mail Agent on free account.

















