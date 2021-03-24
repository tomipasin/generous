const https = require('https');
const xml2js = require('xml2js');
let parser2JSON = require('xml2json');
const parser = new xml2js.Parser({ attrkey: "ATTR" });
let http = require("https");
let request = require("request");
require('dotenv').config({ path: '.env' })
fs = require('fs');

// Step 1 - get XML from TLM server and convert it to JSON:
function TLMdataToBC(arg) {
    let req = https.get("https://tlm-bc-functions.netlify.app/artikelen.xml", function (res) {
        let data = '';
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            parser.parseString(data, function (error, result) {
                if (error === null) {
                    console.log(data)
                    let json = parser2JSON.toJson(data);
                    createProductSchema(json)
                }
                else {
                    console.log(error);
                }
            });
        });
    });

    //Step 2 - create the data structure to POST or PUT into BC
    function createProductSchema(data) {
        const dataToJson = JSON.parse(data)
        const jsonData = dataToJson.artikelen.artikel
        console.log(jsonData)
        Object.keys(jsonData).forEach(key => {
            const name = jsonData[key].omschrijving_en
            const quantity = Number(jsonData[key].voorraad_fysiek)
            const sku = jsonData[key].artikelnr
            const type = 'physical'
            let price = jsonData[key].prijs
            let priceOK = (0)
            if (price) {
                const regex = /[,]/gm;
                let priceConv = price.toString().replace(regex, '.')
                if (priceConv == '[object Object]') {
                    priceOK = 0
                } else {
                    priceOK = parseFloat(priceConv.toString().replace(/\./g, ',').replace(',', '.'))
                }
            }
            let category = jsonData[key].artikelgroep_id
            if (category != 23) {
                category = [23]
            } else {
                category = [jsonData[key].artikelgroep_id]
            }
            const mark = jsonData[key].merk
            const description = jsonData[key].omschrijving_en
            let weight = jsonData[key].gewicht
            if (weight > 0) {
                weight = jsonData[key].gewicht
            } else {
                weight = 0
            }
            let imagesOK = []
            let images = jsonData[key].photos.photo
            if (images) {
                Object.keys(images).forEach(key => {
                    const keyN = Number(key)
                    for (let i in key) {
                        const multI = images[key].$t
                        const oneI  = images
                        if(key !== 'nr' && key !== '$t'){
                        const img = { image_url: multI, is_thumbnail: true }
                            imagesOK.push(img)
                        }

                    } 
                })
            }
            //here's the schema...
            const toUpdate = {
                data: {
                    sku: sku,
                    name: name,
                    inventory_level: quantity,
                    inventory_tracking: "product",
                    description: description,
                    price: priceOK,
                    categories: category,
                    weight: weight,
                    type: type,
                    images: imagesOK
                }
            }
            //all set so let's create the products in BC store.
            createProduct(toUpdate.data)

        })
    }

    //The function to create...
    function createProduct(data) {
        let dataFromSchema = data
        var options = {
            method: 'POST',
            url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v3/catalog/products`,
            headers: {
              'content-type': 'application/json',
              accept: 'application/json',
              'x-auth-token': `${process.env.TOKEN}`
            },
            body: data,
            json: true
          };
          //Using request I can check if the server's response are OK the products are created on store, 
          //no errors and the code finish here. 
          //But if I have a conflict response (code 409) it means that the product already exists and
          //we need proceed the update.
          request(options, function (error, response, body) {
            if (error) throw new Error(error);
            console.log(response.statusCode)
            if(response.statusCode === 409){
                getDataFromBCBySKU(data.sku, data)
            }else{
                return;
            }
          });
    }
    //My function to get BC data with IDs using the SKU as a kind of indexer. 
    function getDataFromBCBySKU(sku, data) {
        const skuNumber = sku;
        let options = {
            method: 'GET',
            url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v2/products?sku=${skuNumber}`,
            headers: { 'x-auth-token': `${process.env.TOKEN}` }
        };
        request(options, function (error, _response, body) {
            if (error) throw new Error(error);
            let xml = body;
            let json = JSON.parse(parser2JSON.toJson(xml));
            let BC_id = json.products.product.id;
            console.log(json)
            //with BC Ids I call the function thar properly get the data and update the BC store. 
            updateBCfromTLM(BC_id, data)
        });
    }
    //this is a simples PUT function...
    function updateBCfromTLM(id, data) {
        const ID = id;
        let options = {
            method: 'PUT',
            url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v3/catalog/products/${ID}`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-auth-token': `${process.env.TOKEN}`
            },
            body: data,
            json: true
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            console.log(body)
        });
    }
}
//to this "update" from customer's store occurs every 24h (86400 seconds) please
//uncoment the line below.


//setTimeout(TLMdataToBC, 86400000);

//and comment this one... ;-)
TLMdataToBC();


