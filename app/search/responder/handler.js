'use strict';

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({region: process.env.SERVERLESS_REGION});


module.exports.handler = function(event, context, callback) {
  /*
  We want to quickly return something to slack to at least confirm we are doing
  something. Otherwise slack shows ugly error messages. Because we can't return
  anything without terminating a lambda, we pass of the real work to an async
  executor and quickly respond with a message that tells Slack "Hey, we aren't
  ignore you!"
  */

  var params = {
    FunctionName: 'search-executor',
    InvocationType: 'Event', // Fire and forget mode
    LogType: 'None',
    Payload: JSON.stringify(event), // Pass through
    Qualifier: process.env.SERVERLESS_STAGE // This allows us to run against the
                                            // search-executor in the same stage
  };

  lambda.invoke(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);

      // Return error message right away if async call fails
      callback(null, {
        'text': 'Uh oh... something went wrong! Relvant XKCD - https://xkcd.com/376/',
        'response_type': 'in_channel'
      });
    } else {
      // Return error message right away if async call fails
      console.log(data);
      // This specific response is what tells slack "we are workin' on it",
      //   without putting anything actually in the channel
      callback(null, {'response_type': 'in_channel'});
    }
  });
};
