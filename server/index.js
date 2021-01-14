  const fs = require('fs');
  require('dotenv').config();
  //require('dotenv').load();
  if (process.env.DOTENV_PATH) {
    require('dotenv').config({ path: process.env.DOTENV_PATH });
  } else {
    require('dotenv').config({ path: __dirname+'/.env' });
  }

  const config = require('./config');

  /*
  let config = {};
  /* first check if configured */
  /*
  if (fs.existsSync(__dirname+'/config.json')) {
    config = require("./config.json");
  }
  */


  //console.log(config);
  /* should we run a hub service with API and WS server */
  if (config.hub && config.hub.enabled) {
    const DApp = require('./lib/dapp');
    const hubModule  = require('./lib/hub');
    const handlers = require('./lib/handlers');
    const apiServer = require('./lib/api-server');
    const wsServer = require('./lib/ws-server');
    const dappModule = new DApp( config );
    hubModule.init();
    handlers.init(dappModule, hubModule, (handlers) => {
      apiServer.init(handlers);
      wsServer.init(handlers);
    });
  }

  /* should we run connected point of service */
  if (config.point && config.point.enabled) {
    const pointModule  = require('./lib/point');
    pointModule.init();
  }
  
  /* should we run a static server */
  if (!config.static || config.static.enabled) {
    const protocol = (config.static && config.static.protocol) ? config.static.protocol : (process.env.HTTP_PROTOCOL || 'http');
    const port = (config.static && config.static.port) ? config.static.port : (process.env.STATIC_PORT || '8080');
    const path = (config.static && config.static.path) ? config.static.path : (process.env.STATIC_PATH || require('path').join(__dirname,'..','build'));
    const http = require(protocol);
    const Static = require('node-static');
    const staticServer = new Static.Server(path);
    const requestListener = (request, response) => {
      staticServer.serve(request, response, (e) => {
        if (e && (e.status === 404)) { // If the file wasn't found
          staticServer.serveFile('/index.html', 200, {}, request, response);
        }
      });      
    };
    if (protocol=='https') {
      http.createServer(config.sslOptions, requestListener).listen(port);
    } else {
      http.createServer(requestListener).listen(port);
    }
    console.log('\x1b[35m%s\x1b[0m',' Static Web Server started on port: '+port+'\n Public path: '+path);
  }

