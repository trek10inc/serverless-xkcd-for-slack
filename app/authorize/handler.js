'use strict';

var OAuth = require('oauth');
var OAuth2 = OAuth.OAuth2;

var oauth2 = new OAuth2(process.env.SLACK_CLIENT_ID,
    process.env.SLACK_CLIENT_SECRET,
    'https://slack.com/',
    '/oauth/authorize',
    '/api/oauth.access',
    null);


module.exports.handler = function(event, context, callback) {
  oauth2.getOAuthAccessToken(
    event.code,
    {'grant_type':'client_credentials'},
    function (e, access_token, refresh_token, results) {
        // Throw out the OAuth, we don't need or want it
        //   returns "Complete" page html mock
        callback(null, 'complete');
    }
  );
};
