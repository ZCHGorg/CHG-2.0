  const config = require('../config');
  const paymentGatewayLib = require('./payment-gateway');
  const http = require('https');
  
  var handlers = {};

  handlers.notFound = (data,callback) => {
    callback(404);
  };

  // get current config for the front-end
  handlers.getConfig = (data,callback) => {
    callback(200, { 
      wsPort: config.server.wsPort,
      apiPort: config.server.apiPort,
      scanUrl: config.scanUrl,
      chargeContractAddress: config.chargeContractAddress,
      serviceContractAddress: config.serviceContractAddress,
      //events: config.events,
      web3Network: config.web3Network,
      btcExplorer: config.bitcoinOptions.explorer,
      ltcExplorer: config.litecoinOptions.explorer,
      googleMapsKey: config.googleMapsKey,
      web3WsProvider: config.web3WsProvider
    });
  };

  // get current location by ip
  handlers.getLocation = (data,callback) => {
    http.get(config.geoLocationUrl+data.ip, (resp) => {
      var data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        try {
          var result = JSON.parse(data);
          callback(200, result);
        } catch (e) {
          callback(400, e);
        }
      });
    }).on("error", (err) => {
      callback(400, err);
    });
  };

  // get all available coins with their fees
  handlers.getFees = (data, callback) => {
    callback(200, handlers.dappModule.swapCoins);
  };

  // get the list of registered nodes
  handlers.getNodes = (data, callback) => {
    const latitude = typeof(data.queryStringObject.latitude) == 'string' ? Number(data.queryStringObject.latitude.trim()) : 0;
    const longitude = typeof(data.queryStringObject.longitude) == 'string' ? Number(data.queryStringObject.longitude.trim()) : 0;
    const radius = typeof(data.queryStringObject.radius) == 'string' ? Number(data.queryStringObject.radius.trim()) : 0;
    const limit = typeof(data.queryStringObject.limit) == 'string' ? Number(data.queryStringObject.limit.trim()) : 0;

    if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radius) || Number.isNaN(limit)) {
      callback(400, {error: 'Missing required field, or field invalid'})
    }

    if (latitude || longitude || radius || limit ) {
      let nodesArray = Object.entries(handlers.dappModule.registeredNodes).sort((a, b) => (Math.abs( Math.abs(Math.abs(a[1].latitude - latitude) + Math.abs(a[1].longitude - longitude))) - Math.abs(Math.abs(b[1].latitude - latitude) + Math.abs(b[1].longitude - longitude))));
      const result = {};
      const count = limit > 0 ? Math.min(limit, nodesArray.length) : nodesArray.length;
      for (let idx = 0; idx < count ; ++idx ) {
        //console.log(nodesArray[idx]);
        result[nodesArray[idx][0]] = nodesArray[idx][1];
      }
      callback(200, result);
    } else {
      callback(200, handlers.dappModule.registeredNodes);
    }
  };

  // get current rates to all available coins/currencies
  handlers.getRates = (data, callback) => {
    callback(200, handlers.paymentGateway.currentRates);
  };

  // get current blockchain blocknumber
  handlers.getBlockNumber = (data, callback) => {
    callback(200, { blockNumber: handlers.dappModule.blockNumber });
  };

  // get the table of sell orders
  handlers.getSellOrders = (data, callback) => {
      callback(200, { sellOrders: handlers.dappModule.sellOrders });
  };
  
  // get the table of buy orders
  handlers.getBuyOrders = (data, callback) => {
      callback(200, { buyOrders: handlers.dappModule.buyOrders });
  };

  // get the best sell market order
  handlers.getBestSellOrder = (data, callback) => {
    const amountCHG = typeof(data.queryStringObject.amountCHG) == 'string' ? data.queryStringObject.amountCHG.trim() : false;
    if (amountCHG) {
      const bestSellOrder = handlers.dappModule.getBestSellOrder(amountCHG);
      callback(200, { bestSellOrder: bestSellOrder });
    } else {
      callback(400, {error: 'Missing required field, or field invalid'})
    }
  };

  // get required data to proceed with payment
  handlers.getPaymentData = (data, callback) => {
    
    const currency = typeof(data.queryStringObject.currency) == 'string' ? data.queryStringObject.currency.trim() : false;
    if (!currency) {
      callback(400, {error: 'Missing required field, or field invalid'});
      return;
    };
    handlers.paymentGateway.getPaymentData(currency, function(error, result){
      if (error) {
        callback(400, {error: result});
      } else {
        callback(200, {paymentData: result});
      }
    });
  };

  // payment confirmation
  handlers.confirmPayment = (data, callback) => {
    var nodeAddress = typeof(data.queryStringObject.nodeAddress) == 'string' ? data.queryStringObject.nodeAddress.trim() : false;
    var payerAddress = typeof(data.queryStringObject.payerAddress) == 'string' ? data.queryStringObject.payerAddress.trim() : false;
    var amount = parseFloat(data.queryStringObject.amount);
    var chgAmount = parseFloat(data.queryStringObject.chgAmount);
    var currency = typeof(data.queryStringObject.currency) == 'string' ? data.queryStringObject.currency.trim() : false;
    var orderHash = typeof(data.queryStringObject.orderHash) == 'string' ? data.queryStringObject.orderHash.trim() : false;
    var paymentId = typeof(data.queryStringObject.paymentId) == 'string' ? data.queryStringObject.paymentId.trim() : false;
    var payerId = typeof(data.queryStringObject.payerId) == 'string' ? data.queryStringObject.payerId.trim() : 'unknown';
    var serviceId = typeof(data.queryStringObject.serviceId) == 'string' ? parseInt(data.queryStringObject.serviceId) : 0;

    //if (!( (amount>0) && currency && orderHash && nodeAddress && paymentId)) {
    if (!( amount>0 && currency && paymentId && orderHash && nodeAddress) && 
        !(amount>0 && currency && paymentId && payerAddress) ) {
        callback(400, {error: 'Missing required field, or field invalid'});
      return;
    }


    var paymentData = {
      station: nodeAddress,
      amount: amount,
      currency: currency,
      paymentId: paymentId,
      payerId: payerId,
      serviceId: serviceId,
      orderHash: orderHash,
      payer: payerAddress,
      chgAmount: chgAmount,
      //tradeData: handlers.tradeData,
    };

    handlers.paymentGateway.confirmPayment(paymentData, (error, result) => {
      console.log('handlers.paymentGateway',error, result);
      if (error) {
        callback(400, {error: error, result: result});
      } else {
        callback(200, {paymentResult: result});
      }
    });
  };

  // start the service
  handlers.serviceOn = (data, callback) => {
    var payerId = typeof(data.queryStringObject.payerId) == 'string' ? data.queryStringObject.payerId.trim() : 'unknown';
    var paymentId = typeof(data.queryStringObject.paymentId) == 'string' ? data.queryStringObject.paymentId.trim() : false;
    var txHash = typeof(data.queryStringObject.txHash) == 'string' ? data.queryStringObject.txHash.trim() : false;

    if (!(payerId && paymentId && txHash)) {
      callback(400, {error: 'Missing required field, or field invalid'});
      return;
    };

    // check payment data first
    handlers.dappModule.getServiceData({
      txHash: txHash,
      payerId: payerId,
      paymentId: paymentId,
    }, (error, serviceData) => {
      if (error) {
        callback(400, {error: error, result: serviceData});
      } else {
        // then send to the node
        console.log(serviceData);
        handlers.hubModule.sendToNode(serviceData.nodeAddress, 'serviceOn', serviceData, (error, serviceResults) => {
          if (error) {
            callback(400, {error: error, result: serviceResults});
          } else {
            callback(200, serviceResults);
            //callback(200, {status: status, info: handlers.dappModule.registeredNodes[nodeAddress]});
          }
        });
      }
    });
  };

  // stop the service
  handlers.serviceOff = (data, callback) => {
    var payerId = typeof(data.queryStringObject.payerId) == 'string' ? data.queryStringObject.payerId.trim() : 'unknown';
    var paymentId = typeof(data.queryStringObject.paymentId) == 'string' ? data.queryStringObject.paymentId.trim() : false;
    var txHash = typeof(data.queryStringObject.txHash) == 'string' ? data.queryStringObject.txHash.trim() : false;

    if (!(payerId && paymentId && txHash)) {
      callback(400, {error: 'Missing required field, or field invalid'});
      return;
    };

    // check payment data first
    handlers.dappModule.getServiceData({
      txHash: txHash,
      payerId: payerId,
      paymentId: paymentId,
    }, (error, serviceData) => {
      if (error) {
        callback(400, {error: error, result: serviceData});
      } else {
        // then send to the node
        handlers.hubModule.sendToNode(serviceData.nodeAddress, 'serviceOff', serviceData, (error, serviceResults) => {
          if (error) {
            callback(400, {error: error, result: serviceResults});
          } else {
            callback(200, serviceResults);
          }
        });
      }
    });
  };

  // get the service status
  handlers.serviceStatus = (data, callback) => {
    var payerId = typeof(data.queryStringObject.payerId) == 'string' ? data.queryStringObject.payerId.trim() : 'unknown';
    var paymentId = typeof(data.queryStringObject.paymentId) == 'string' ? data.queryStringObject.paymentId.trim() : false;
    var txHash = typeof(data.queryStringObject.txHash) == 'string' ? data.queryStringObject.txHash.trim() : false;

    if (!(payerId && paymentId && txHash)) {
      callback(400, {error: 'Missing required field, or field invalid'});
      return;
    };

    handlers.dappModule.getServiceData({
      txHash: txHash,
      payerId: payerId,
      paymentId: paymentId,
    }, (error, serviceData) => {
      if (error) {
        callback(400, {error: error, result: serviceData});
      } else {
        // then send to the node
        handlers.hubModule.sendToNode(serviceData.nodeAddress, 'serviceStatus', serviceData, (error, serviceResults) => {
          if (error) {
            callback(400, {error: error, result: serviceResults});
          } else {
            callback(200, serviceResults);
          }
        });
      }
    });
  };


  // get the node status
  handlers.nodeStatus = (data, callback) => {
    const nodeAddress = typeof(data.queryStringObject.address) == 'string' ? data.queryStringObject.address.trim() : false;
    if (!nodeAddress) {
      callback(400, {error: 'Missing required field, or field invalid'});
      return;
    };
    handlers.hubModule.sendToNode(nodeAddress, 'nodeStatus', null,(error, nodeData) => {
      if (error) {
        callback(400, {error: error, result: nodeData});
      } else {
        callback(200, nodeData);
        //callback(200, {status: status, info: handlers.dappModule.registeredNodes[nodeAddress]});
      }
    });
  };

  // the node is connected to the hub
  handlers.nodeConnect = (nodeData, ws) => {  
    console.log('handlers.nodeConnect', nodeData.address);
    handlers.hubModule.nodeConnect(nodeData, ws);
    if (handlers.dappModule.registeredNodes[nodeData.address]) {
      handlers.dappModule.registeredNodes[nodeData.address].connected = true;
      handlers.dappModule.registeredNodes[nodeData.address].ip = nodeData.ip;
      handlers.dappModule.registeredNodes[nodeData.address].assets = nodeData.assets;
    }
    if (handlers.wss) {
      handlers.wss.broadcast({
        message: 'nodeConnected',
        payload: nodeData.address
      });
    }
  };

  // the node is disconnected from the hub
  handlers.nodeDisconnect = (nodeAddr) => {  
    console.log('handlers.nodeDisconnect', nodeAddr);
    handlers.hubModule.nodeDisconnect(nodeAddr);
    if (handlers.dappModule.registeredNodes[nodeAddr]) {
      handlers.dappModule.registeredNodes[nodeAddr].connected = false;
      handlers.dappModule.registeredNodes[nodeData.address].ip = null;
      handlers.dappModule.registeredNodes[nodeData.address].assets = null;
    }
    if (handlers.wss) {
      handlers.wss.broadcast({
        message: 'nodeDisconnected',
        payload: nodeAddr
      });
    }
  };

  handlers.wsMessageHandler = (wsData) => {  
    console.log('handlers.wsMessageHandler', wsData);
  };

  handlers.wsCloseHandler = (wsData) => {  
    console.log('handlers.wsCloseHandler', wsData);
  };

  
  handlers.init = (dappModule, hubModule, callback) => {
    handlers.dappModule = dappModule;
    handlers.hubModule = hubModule;
    handlers.paymentGateway = paymentGatewayLib.init(dappModule);
    callback(handlers);
  };


// Export the handlers
module.exports = handlers;
