# Generous Test

### Objective:
Write a webservice in Node JS capable of get information from customer by XML and upload it to BigCommerce platform, checking if the product need to be created or updated.

### Goals:
With __*TLMtoBC.js*__ we can:
* Do a http request to grab the XML data from customer's server and convert this data to JSON format using xml2js package. 
* Create a data sctructure to use when create and update data. 
* Check if the product may be created or updated and act according this. 
* If it will be created the code stop after this but if they need update data the code get the existing BC products data and use the IDs and SKU to update new data to server. 

