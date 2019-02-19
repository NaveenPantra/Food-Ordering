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
        "itemQuantity": "<int> grms/ml"
      }
    }
  }
}
```
There will be may `category name`'s and in each `category` there will be `items name` as object that contain `item` details, `itemCost` is stored in `integer` format as `inr` currency. 

