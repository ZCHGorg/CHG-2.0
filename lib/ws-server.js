const config = require('../config');
const WebSocket = new require('ws');
const http = require(config.server.protocol);
const wsServer = {};

wsServer.init = handlers => {

  console.log('wsServer init...');
  if (config.server.protocol=='https') {
    const httpServer = http.createServer(config.server.protocol=='https');
    httpServer.listen(config.server.wsPort);
    handlers.wss = new WebSocket.Server({server: httpServer});
  }else{
    handlers.wss = new WebSocket.Server({port: config.server.wsPort, host: '0.0.0.0'});
    /*const httpServer = http.createServer();
    httpServer.listen(config.server.wsPort);
    handlers.wss = new WebSocket.Server({server: httpServer});*/
  }  
  console.log("webSocket start");

  handlers.wss.on('connection', (ws, req) => {

    const ipAddress = req.connection.remoteAddress;
    //const ip2 = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    console.log('New WS connection', new Date(), ipAddress );  //, req.headers);
    //console.log(req);
    //console.log(ws);
    //handlers.wss.broadcast(req);
    //handlers.wss.broadcast(ws);

    let clientId = ''; // client MAC address (used for captive portal)
    let nodeAddr = ''; // if it is node then init by node address

    ws.on('message', wsData => {
      try{
        const msgData = JSON.parse(wsData);
        console.log('wsMessage', msgData);

        if (msgData.message == 'nodeConnect') {
          nodeData = msgData.payload;
          //signedMessage = msgData.payload.signed;  //check if authorized
          console.log('nodeConnected ' + nodeData.address + ' ' + nodeData.info + '  ip - ' + ipAddress);
          nodeData.ip = ipAddress;
          nodeAddr = nodeData.address;
          handlers.nodeConnect(nodeData, ws);

        } else if (msgData.message == 'clientConnect') {

          console.log('clientConnected ' + msgData.payload.id + '  ip - ' + ipAddress);

          clientId = msgData.payload.id;
          clientMAC = msgData.payload.mac;
          clientIp = ipAddress;

          ws.clientId = clientId;

          /*
          ws.send(JSON.stringify({
            message: 'paymentFees',
            payload: config.fees
          }));
          */

          //send current rates to a new connected client
          ws.send(JSON.stringify({
            message: 'currentRates',
            payload: handlers.paymentGateway.currentRates
          }));

        } else if (msgData.message == 'nodeCallback') {
          if (msgData.callbackToken) {
            handlers.hubModule.onNodeCallback(msgData);
          }
        } else {
          console.log('wsMessageHandler');
          handlers.wsMessageHandler(wsData);
        }
      } catch(e){
        console.log(e);
      }

      console.log('wsMessage');

    });

    ws.on('error', err => {
      console.log('wsError', err);
    });

    ws.on('close', connId => {
      console.log('wsClose', connId, clientId);
      if (nodeAddr) {
        handlers.nodeDisconnect(nodeAddr);
      }
      handlers.wsCloseHandler(clientId);
    });

  });

  handlers.wss.broadcast = data => {
    //console.log(1, data);
    //console.log(2, Array.isArray(handlers.wss.clients));
    //if (Array.isArray( handlers.wss.clients) ) {
      handlers.wss.clients.forEach(ws => {
        //console.log(2, ws.clientId);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
      });
    //}
  };

  //update rates for all clients
  setInterval(()=>{
    handlers.wss.broadcast({
      message: 'currentRates',
      payload: handlers.paymentGateway.currentRates
    });
  }, config.updateRatesInterval);

  handlers.dappModule.on('registeredNodes', ()=>{
    handlers.hubModule.updateNodesConnection(handlers.dappModule, handlers.wss);
  });

  console.log('\x1b[35m%s\x1b[0m','The WebSocket server is running on port '+config.server.wsPort);
}

module.exports = wsServer;
 