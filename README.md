# Generous Test

### Objective:
Write a webservice using JS (Node) capable of get information from TLM customer by XML and upload it to BigCommerce platform.

### Goals:
With __*TLMtoBC.js*__ we can:
* Get the XML from customer's server and convert the data to JSON format. 
* Create a data sctructure to use when create and update data. 
* Check if the product may be created or updated and act according this. 
* If it will be created the code stop after this but if they need update data the code get the existing BC products data and use the IDs and SKU to update new data to server. 

### Issues that I'm working on:
* When I convert the XML from TLM customer to JSON (I don't know why) they treat the register with only one image different than other with 2 or more causing a empty object as result on the first one and this is not allowed on BC. In these cases I set an generic image instead of develop another code to deal with this few cases.


