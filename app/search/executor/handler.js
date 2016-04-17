'use strict';

const _ = require('lodash');
const elasticlunr = require('elasticlunr');
const qs = require('qs');
const request = require('request');
const xkcdData = require('./xkcd-data.json');

let CACHE = {};


//TODO shuffle this all off too another worker so we can instantly respond to slack message

// Could probably configure to weight some fields more so than other
//  preliminary tests are good though
let index = elasticlunr(function () {
    this.addField('title');
    this.addField('transcript');
    this.addField('alt');
    this.setRef('num');
});

function sendApology(event){

  // Did this, quite frankly too lazy to promisify request lib ¯\_(ツ)_/¯
  return new Promise(function(resolve, reject){
    let message;

    const apologies = [
      'Sorry the cache was cold... putting it in the oven!',
      'Caches roasting over the open fire... your comics coming up soon.',
      'There is no cloud, it\'s just someone else computer... and it\'s going slower than we\'d like right now.',
      'Cooking up a fresh batch of cache just for you, sorry for the wait!',
      'Why did the developer go broke? Because he used up all his cache... sorry for the wait!',
      'Getting more Cache in our Series A funding round... sorry for the wait!',
      'There are only two hard things in computer science: cache invalidation naming things, and off-by-one errors... sorry for the wait!',
    ];

    message = {
      'response_type': 'in_channel',
      'text': _.sample(apologies)
    };

    request({
        url: event.response_url,
        method: 'POST',
        json: message
      }, function(error, response, body){
          if(error) {
              console.log(error);
              reject(error);
          } else {
              console.log(response.statusCode, body);
              resolve();
          }
      });
  });
}

function doSearch(event, callback){
  const search = event.text;
  const results = CACHE.index.search(search);
  let message;

  if(results[0]){
    message = {
      'response_type': 'in_channel',
      'unfurl_link': true,
      'text':`http://xkcd.com/${results[0].ref}/`
    };
  } else {
    message = {
      'response_type': 'in_channel',
      'unfurl_link': true,
      'text':`Well this is embarrassing... we didn't find anything for
      ${search}. https://xkcd.com/376/`
    };
  }

  request({
      url: event.response_url,
      method: 'POST',
      json: message
    }, function(error, response, body){
        if(error) {
            console.log(error);
        } else {
            console.log(response.statusCode, body);
          }

        callback();
    });
}

module.exports.handler = function(event, context, callback) {
  console.log(event);

  // Confusing because we have to parse a string, then the actual event
  //   object to extract a query string as the usable object
  event = qs.parse(event.body);

  /*
  If we take longer than 3 seconds, slack complains. On cache miss the index
  build takes ~3 seconds. A cache hit is 2.5 milliseconds (a little faster).
  So, if we don't have cache, we are responsible universe citizens and send
  an apology and followup later with the results.
  */

  // Switch to promises cause this responds poorly

  if(CACHE.index){
    console.info('CACHE: HIT');
    doSearch(event, callback);
  } else {
    sendApology(event).then(function(){
      console.info('CACHE: MISS');
      _.forEach(xkcdData, function(datum){
        datum.transcript = datum.transcript.replace(/[^a-zA-Z ]/g, ' ');
        index.addDoc({
          num: datum.num,
          title: datum.title,
          transcript: datum.transcript,
          alt: datum.alt
        });
      });
      CACHE.index = index;
      doSearch(event, callback);
    });
  }
};
