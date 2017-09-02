const expect  = require("chai").expect;
const MicroserviceClient = require('@microservice-framework/microservice-client');

require('dotenv').config();

describe('USERS CRUD API',function(){
  var client = new MicroserviceClient({
    URL: process.env.SELF_URL,
    secureKey: process.env.SECURE_KEY,
  });
  var RecordID;
  var RecordToken;
  var userMember = {
    login: 'user',
    password: 'user',
  }
  it('POST should return 200',function(done){
    client.post(userMember, function(err, handlerResponse){
      console.log(err);
      console.log(handlerResponse);
      //RecordID = handlerResponse.login;
      //RecordToken = handlerResponse.token;
      expect(err).to.equal(null);
      done();
    });
  });
});
