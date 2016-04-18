'use strict';

const _ = require('lodash');
const elasticlunr = require('elasticlunr');
const qs = require('qs');
const request = require('request');
const xkcdData = require('./xkcd-data.json');

let CACHE = {};

let index = elasticlunr(function () {
    this.addField('title');
    this.addField('transcript');
    this.addField('alt');
    this.addField('number');
    this.setRef('id');
});

function doSearch(event, callback){
  const search = event.text;
  console.log('SEARCH:', search);

  // Further improvement would to be to add some variance
  // within some margin to allow a vague search term to return different comics
  const results = CACHE.index.search(search,{
    fields: {
        number: {boost: 999}, // Hack to force an "ID" to always bubble to top
        title: {boost: 8},
        transcript: {boost: 2},
        alt: {boost: 1}
    }
  });

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
  event = qs.parse(event.body);

  /*
  On cache miss the index build takes ~3 seconds.
  A cache hit is 2.5 milliseconds (a little faster).
  */

  if(CACHE.index){
    console.info('CACHE: HIT');
  } else {
      console.info('CACHE: MISS');
      _.forEach(xkcdData, function(datum){
        datum.transcript = datum.transcript.replace(/[^a-zA-Z ]/g, ' ');
        index.addDoc({
          id: datum.num,
          number: datum.num,
          title: datum.title,
          transcript: datum.transcript,
          alt: datum.alt
        });
      });
      CACHE.index = index;
  }

  doSearch(event, callback);
};
