const Promise = require('q').Promise

// google maps
const apiKey = "tuvieja"

const googleMapsClient = require('@google/maps').createClient({
    key: apiKey,
    Promise: Promise
});

// https://app.redislabs.com/#/login
// redis
// https://cloud.google.com/appengine/docs/flexible/nodejs/using-redislabs-redis
const redis = require('redis')

const bluebird = require('bluebird')
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(
    '13690',
    'redis-13690.c13.us-east-1-3.ec2.cloud.redislabs.com',
    {
      'auth_pass': 'tuvieja!',
      'return_buffers': true
    }
  ).on('error', (err) => console.error('ERR:REDIS:', err));


/**
     * 
     * @param {*Object to be geocoded} search 
     */
doGeocode = (search) => {
    console.log("geocoding ", search);
    return googleMapsClient.geocode(search).asPromise();
}

processGeocoding = (res, key, search) => {
    return doGeocode(search).then((result) => {
        // console.log("geocode result", result)
        let response = result.json.results[0].geometry.location
        let value = JSON.stringify(response)
        console.log("About to store val in cache " + `${value}`)
        client.setAsync(key, `${value}`)
            .then((result) => res.status(200).send(response))
            .catch((err) => {
                console.warn("Unable to store entry in cache", err)
                res.status(200).send(response)
            })
      });
}

// https://cloud.google.com/functions/docs/writing/http
exports.geocode = (req, res) => {
    if (req.body === undefined) {
      // This is an error case, as "message" is required.
      res.status(400).send('No body defined!');
    } else {
      // Everything is okay.
      console.log("Hitting google maps to geocode this shit");
      let key = JSON.stringify(req.body).toString()
      console.log("Using key", key)
    //   let key = req.body
      client.getAsync(key)
        .then((cacheResult) => {
            if(cacheResult){
                console.log("Returning value from cache")
                res.status(200).send(JSON.parse(cacheResult));
            } else {
                console.log("Fetching value from maps", cacheResult)
                processGeocoding(res, key, req.body)
            }
        })
        .catch((err) => {
            console.warn("Error while fetching value from cache ", err)
            processGeocoding(res, key, req.body)
        })
      
    }
  };