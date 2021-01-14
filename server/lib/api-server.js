const config = require('../config');
const http = require(config.server.protocol);
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
//const path = require('path');

// Parse a JSON string to an object in all cases, without throwing
const parseJsonToObject = (str) => {
  try{
    const obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

var apiServer = {};

apiServer.init = (handlers) => {

  console.log('apiServer init...');


  apiServer.handlers = handlers;
  
  apiServer.router = {
    'api/getConfig' : handlers.getConfig,
    'api/getNodes' : handlers.getNodes,

    'api/getBlockNumber' : handlers.getBlockNumber,
    'api/getFees' : handlers.getFees,
    'api/getRates' : handlers.getRates,
    'api/getLocation' : handlers.getLocation,
    'api/getSellOrders' : handlers.getSellOrders,
    'api/getBuyOrders' : handlers.getBuyOrders,
    'api/getBestSellOrder' : handlers.getBestSellOrder,
    //'api/getBestBuyOrder' : handlers.getBestBuyOrder,
    //'api/getPrice' : handlers.getPrice,
    'api/getPaymentData' : handlers.getPaymentData,
    'api/confirmPayment' : handlers.confirmPayment,

    'api/nodeStatus' : handlers.nodeStatus,
    'api/serviceOn' : handlers.serviceOn,
    'api/serviceOff' : handlers.serviceOff,
    'api/serviceStatus' : handlers.serviceStatus,
  };

  apiServer.http.listen(config.server.apiPort, () => {
   console.log('\x1b[35m%s\x1b[0m','The API server is running on port '+config.server.apiPort);
  });

  if (config.runDApp){
    const Static = require('node-static');
    const fileServer = new Static.Server(config.server.path);

    if (config.server.protocol=='https') {
      http.createServer(config.sslOptions, (req, res) => {
        fileServer.serve(req, res);
      }).listen(config.server.port);
    } else {
      http.createServer((req, res) => {
        fileServer.serve(req, res);
      }).listen(config.server.port);
    }
    console.log('\x1b[35m%s\x1b[0m','The Static Web Server is running on port '+config.server.port);
  }

};

if (config.server.protocol=='https') {
  apiServer.http = http.createServer(config.sslOptions, (req,res) => {
    apiServer.handleRequest(req,res);
  })
} else {
  apiServer.http = http.createServer((req,res) => {
    apiServer.handleRequest(req,res);
  })
}

apiServer.handleRequest = (req,res) => {

  const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const queryStringObject = parsedUrl.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder('utf-8');
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();
        const chosenHandler = typeof(apiServer.router[trimmedPath]) !== 'undefined' ? apiServer.router[trimmedPath] : apiServer.handlers.notFound;
        const data = {
          'trimmedPath' : trimmedPath,
          'queryStringObject' : queryStringObject,
          'ip' : ip,
          'method' : method,
          'headers' : headers,
          'payload' : parseJsonToObject(buffer)
        };
        try{
          chosenHandler(data, (statusCode, payload) => {
            apiServer.processHandlerResponse(res, method, trimmedPath, statusCode, payload);
          });
        }catch(e){
          console.log(e);
          apiServer.processHandlerResponse(res, method, trimmedPath, 500, {'Error' : 'An unknown error has occured'});
        }
    });

  };
 
  apiServer.processHandlerResponse = (res, method, trimmedPath, statusCode, payload) => {
    console.log(trimmedPath, statusCode, payload);
    statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    let payloadString = '';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', '*');
    //res.setHeader('Access-Control-Allow-Headers', 'application/json');

    payload = typeof(payload) == 'object'? payload : {};
    payloadString = JSON.stringify(payload);

    res.writeHead(statusCode);
    res.end(payloadString);

    if(statusCode == 200){
      console.log('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
    } else {
      console.log('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
    }
  };
    
  module.exports = apiServer;
 