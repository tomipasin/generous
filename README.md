# Generous

### Objective:
Write a webservice in Node JS capable of get information from customer by XML and upload it to BigCommerce platform, checking if the product need to be created or updated.

### Goals:
With __*TLMtoBC.js*__ we can:
* Do a http request to grab the XML data from customer's server and convert this data to JSON format. 
* Create a data sctructure to use when create and update data. 
* Checking if the product may be created or updated and acting according this.
* If it will be created the code stop after this but if they need update data the code get the existing BC products data and use the IDs and SKU to update new data to server. 
* In this example the customer has 24 products without image, others with no price, stock or weight, so we already treat the data to fit the BC requirements.

### How can you test locally?
1. Clone this repository;
2. All dependences you need are in package.json, so run `npm i` and all of them will be installed.
3. You need create and fill the __.env__ file with your Big Commerce credentials. Store this file on the project's root. 
This repository has a __.env_Template__ to help you with this. 
4. Run `npm start` to start the process. 

P.S: If this code will be executed once time a day please these instructions below on __*TLMtoBC.js*__ :

```javascript
//to this "update" from customer's store occurs every 24h (86400 seconds) please
//uncoment the line below.

//setTimeout(TLMdataToBC, 86400000);

//and comment this one... ;-)
TLMdataToBC();

```

### Questions?
* email: tomipasin@gmail.com 
* Telegram: @tomipasin


