/**
 * Profile Stats MicroService.
 */
'use strict';

const framework = '@microservice-framework';
const Cluster = require(framework + '/microservice-cluster');
const Microservice = require(framework + '/microservice');
const MicroserviceRouterRegister = require(framework + '/microservice-router-register').register;
const clientViaRouter = require(framework + '/microservice-router-register').clientViaRouter;

const debugF = require('debug');
const crypto = require('crypto');

var debug = {
  log: debugF('users-login:log'),
  debug: debugF('users-login:debug')
};

require('dotenv').config();



var mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL + process.env.MONGO_PREFIX + process.env.MONGO_OPTIONS,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
  schema: process.env.SCHEMA
});

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE,
  port: process.env.PORT,
  hostname: process.env.HOSTNAME,
  count: process.env.WORKERS,
  callbacks: {
    init: microserviceUsersLoginINIT,
    validate: microserviceUsersLoginVALIDATE,
    POST: microserviceUsersLoginPOST,
    OPTIONS: microserviceUsersLoginOPTIONS
  }
});


/**
 * Options handler.
 */
function microserviceUsersLoginOPTIONS(jsonData, requestDetails, callbacks, callback) {
  mservice.options(jsonData, requestDetails, callbacks, function(err, handlerResponse) {
    handlerResponse.answer['methods']['POST']['description'] = 'Login and receive accessToken';
    callback(err, handlerResponse);
  });
}

/**
 * Init Handler.
 */
function microserviceUsersLoginINIT(cluster, worker, address) {
  if (worker.id == 1) {
    var mserviceRegister = new MicroserviceRouterRegister({
      server: {
        url: process.env.ROUTER_URL,
        secureKey: process.env.ROUTER_SECRET,
        period: process.env.ROUTER_PERIOD,
      },
      route: {
        path: [process.env.SELF_PATH],
        url: process.env.SELF_URL,
        secureKey: process.env.SECURE_KEY
      },
      cluster: cluster
    });
  }
}

/**
 * Validate handler.
 */
function microserviceUsersLoginVALIDATE(method, jsonData, requestDetails, callback) {
  if (requestDetails.credentials) {
    if (requestDetails.credentials.role != 'admin') {
      return callback(new Error('Access violation. You have no right to create new user.'));
    }
  }
  if (method.toLowerCase() == 'post') {
    return callback(null);
  }
  mservice.validate(method, jsonData, requestDetails, callback);
}

/**
 * POST handler.
 */
function microserviceUsersLoginPOST(jsonData, requestDetails, callback) {
  jsonData.login = jsonData.login.toLowerCase();
  loginValidation(jsonData.login, jsonData.password, requestDetails, function(err) {
    if (err) {
      return callback(err);
    }
    callback(new Error('we have to return new access token here'));
  })
}

/**
 * Validate login.
 */
function loginValidation(login, password, requestDetails, callback) {
  if (login.length < process.env.LOGIN_MIN_LENGTH) {
    return callback(new Error('Minimum login length is ' + process.env.LOGIN_MIN_LENGTH));
  }
  if (login.length > process.env.LOGIN_MAX_LENGTH) {
    return callback(new Error('Maximum login length is ' + process.env.LOGIN_MAX_LENGTH));
  }
  var searchUser = {
    login: login
  }
  clientViaRouter('users', function(err, usersServer) {
    if (err) {
      return callback(err);
    }
    usersServer.search(searchUser, function(err, answer) {
      if (err) {
        debug.debug('usersServer.search err %O', err);
        debug.log('usersServer.search failed with error.');
        return callback(err);
      }
      let user = answer[0];
      crypto.pbkdf2(
        password,
        user.hash.salt,
        user.hash.iterations,
        user.hash.keylen,
        user.hash.digest,
        function(err, derivedKey) {
          if (err) {
            return callback(err);
          }
          if (user.hash != derivedKey.toString('hex')) {
            return callback(new Error('Password mismatch'));
          };
          callback(err);
        }
      );
    });
  });
}
