let https = require('https');
let xml2js = require('xml2js');
let parser2JSON = require('xml2json');
let parser = new xml2js.Parser({ attrkey: "ATTR" });
let request = require("request");

require('dotenv').config({ path: '.env' })
fs = require('fs');

// Step 1 - get XML from TLM server and convert it to JSON:
function TLMdataToBC(arg) {
    let req = https.get(`${process.env.XML_SOURCE}`, function (res) {
        let data = '';
        res.on('data', function (stream) {
            data += stream;
        });
        res.on('end', function () {
            parser.parseString(data, function (error, result) {
                if (error === null) {
                    let json = parser2JSON.toJson(data);
                    console.log((json))
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
                for (const chave in images) {
                    let imgOK = `${images[chave]}`
                    const img = { image_url: imgOK, is_thumbnail: true }
                    if (imgOK != '[object Object]' && imgOK != '1') {
                        if (img != '{ image_url: "1", is_thumbnail: true }') {
                            imagesOK.push(img)
                        }
                    }
                }
                Object.keys(images).forEach(key => {
                    for (let i in key) {
                        const mto = images[key].$t
                        const img = { image_url: mto, is_thumbnail: true }
                        if (mto != undefined) {
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
            console.log(toUpdate.data)

            //all set so let's create the products in BC store.
            createProduct(toUpdate.data)

        })
    }

    //The function to create...
    function createProduct(data) {
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
            if (response.statusCode === 409) {
                getDataFromBCBySKU(data.sku, data)
            } else {
                console.log(response.statusCode)
                return;
            }
        });

        //Ahd here's my function to get BC data with IDs using the SKU as a kind of indexer. 
        function getDataFromBCBySKU(sku, data) {
            let options = {
                method: 'GET',
                url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v2/products?sku=${sku}`,
                headers: { 'x-auth-token': `${process.env.TOKEN}` }
            };
            request(options, function (error, _response, body) {
                if (error) throw new Error(error);
                let xml = body;
                let json = JSON.parse(parser2JSON.toJson(xml));
                let BC_id = json.products.product.id;

                //one schema to update with images
                let jsonDataOK = {
                    id: BC_id,
                    sku: data.sku,
                    name: data.name,
                    inventory_level: data.inventory_level,
                    inventory_tracking: "product",
                    description: data.description,
                    price: data.price,
                    type: data.type,
                    images: data.images
                }
                //and another without images to update
                let jsonDataNoImageOK = {
                    id: BC_id,
                    sku: data.sku,
                    name: data.name,
                    inventory_level: data.inventory_level,
                    inventory_tracking: "product",
                    description: data.description,
                    price: data.price,
                    type: data.type
                }
                console.log(json)

                //here we will check how many images each product have on BC
                let optionsImage = {
                    method: 'GET',
                    url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v3/catalog/products/${BC_id}/images`,
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-auth-token': `${process.env.TOKEN}`
                    }
                };
                request(optionsImage, function (error, response, body) {
                    if (error) throw new Error(error);
                    let bodyRaw = body;
                    let jsonI = JSON.parse(bodyRaw);
                    //let's check both images array length
                    let sourceImages = jsonDataOK.images.length;
                    let BCImages = jsonI.data.length;
                    //and here we get the image(s) id from BC
                    let BC_Images = jsonI.data;
                    //if the BC product has no images the code will perform a complete update.
                    if (BCImages === 0) {
                        updateBCfromTLM(BC_id, jsonDataOK)
                    }
                    //now we get each image ID that belongs to each ID and, with a conditional, 
                    //check if the update will contain images or not.
                    for (const chave in BC_Images) {
                        let idImage = (BC_Images[chave].id)
                        //our conditional is here to check if BC product has less images than XML source
                        //this code will delete all images and call for an update of images to product.
                        if (BCImages < sourceImages) {
                            var options = {
                                method: 'DELETE',
                                url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v3/catalog/products/${BC_id}/images/${idImage}`,
                                headers: {
                                    accept: 'application/json',
                                    'content-type': 'application/json',
                                    'x-auth-token': `${process.env.TOKEN}`
                                }
                            };
                            request(options, function (error, response, body) {
                                if (error) throw new Error(error);
                                console.log(body);
                                updateBCfromTLM(BC_id, jsonDataOK)
                            });
                        //if the number of images in BC and source match we will update only the other fields. 
                        } else {
                            updateBCfromTLM(BC_id, jsonDataNoImageOK)
                        }
                        console.log(idImage)
                    }
                    console.log(`Data: ${jsonDataOK.images.length}`)
                    console.log(`BC: ${jsonI.data.length}`);
                });
            });
        }
        //this is a simples PUT function...
        function updateBCfromTLM(id, data) {
            let options = {
                method: 'PUT',
                url: `https://api.bigcommerce.com/stores/${process.env.STORE}/v3/catalog/products/${id}`,
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
}
//to this "update" from customer's store occurs every 24h (86400 seconds) please
//uncoment the line below.


//setTimeout(TLMdataToBC, 86400000);

//and comment this one... ;-)
TLMdataToBC();



