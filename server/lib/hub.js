'use strict';
const WebSocket = new require('ws');

module.exports = {
    
    init: () => {
        this.nodes = {}; //connected nodes
        this.callbacks = {}; //websocket to API callbacks
    },
    
    // send message to the node (and wait for the callback)
    sendToNode: (nodeAddress, message, payload, callback) => {

        if (!(this.nodes[nodeAddress] && this.nodes[nodeAddress].connected)) {
            callback(true, {error: "Not connected"});
            return;
        }

        //console.log(this.nodes[nodeAddress].ws.readyState);
        if (this.nodes[nodeAddress].ws.readyState !== WebSocket.OPEN) {
            this.nodes[nodeAddress].connected = false;
            callback(true, {error: "Not connected"});
            return;
        }

        //const callbackToken = dappModule.web3js.sha3( Math.random());
        //const callbackToken = Crypto.randomBytes(48).toString('base64');
        const callbackToken = Math.random(nodeAddress + Math.random());
        this.callbacks[callbackToken] = callback;

        console.log('sent to ' + nodeAddress);
        this.nodes[nodeAddress].ws.send(JSON.stringify({
            message: message,
            payload: payload,
            callbackToken: callbackToken
        }));

    },
    
    // the node websocket callback 
    onNodeCallback: (msgData) => {
        if (typeof this.callbacks[msgData.callbackToken] == 'function' ) {
            this.callbacks[msgData.callbackToken](msgData.error, msgData.payload);
            delete this.callbacks[msgData.callbackToken];
        }
    },

    nodeConnect: (nodeData, ws) => {
        //console.log(nodeData);
        this.nodes[nodeData.address] = {
            connected: true,
            ws: ws,
            ip: nodeData.ip,
            assets: nodeData.assets,
            status: nodeData.status,
        };
    },
    
    nodeDisconnect: (nodeAddr) => {
        if (this.nodes[nodeAddr] && this.nodes[nodeAddr].connected) {
            this.nodes[nodeAddr].connected = false;
        }
    },
    
    // update nodes points of services status, used if hub is restarted
    updateNodesConnection: (dappModule, wss) => {
        for (var nodeAddr in dappModule.registeredNodes) {
            if (this.nodes[nodeAddr]) {
                dappModule.registeredNodes[nodeAddr].connected = this.nodes[nodeAddr].connected;
                dappModule.registeredNodes[nodeAddr].ip = this.nodes[nodeAddr].ip;
                dappModule.registeredNodes[nodeAddr].assets = this.nodes[nodeAddr].assets;
            } else {
                dappModule.registeredNodes[nodeAddr].connected = false;
                dappModule.registeredNodes[nodeAddr].ip = null;
                dappModule.registeredNodes[nodeAddr].assets = null;
            }
            wss.broadcast({
                message: dappModule.registeredNodes[nodeAddr].connected ? 'nodeConnected' : 'nodeDisconnected',
                payload: nodeAddr
            });
        }
    },

}