const WebSocket = require('ws');
const Web3 = require('web3');

class DApp {

    constructor(config) {

        console.log(config)

        this.chargAbi = require("../abi/ChargCoins.json");
        this.serviceAbi = require("../abi/ChargService.json");
        this.web3js = null;

        this.timeConvert = 3600; //from seconds to hours
    
        this.config = config;

        this.gasPrice = config.gasPrice;
        this.gasLimit = config.gasLimit;
    
        this.swapCoins = {};
        this.services = [];
        this.nodeServices = [];

        this.blockNumber = 0;
        this.subscriptions = {};
    
        this.events = [];

        this.registeredNodes = {};
        this.sellOrders = {};
        this.buyOrders = {};

        this.initWeb3();
    };
/*
    keccak256(...args) {
        args = args.map(arg => {
          if (typeof arg === 'string') {
            if (arg.substring(0, 2) === '0x') {
                return arg.slice(2)
            } else {
                return this.web3js.toHex(arg).slice(2)
            }
          }
          if (typeof arg === 'number') {
            console.log('0x'+(Array(64).join('0') + (arg).toString(16)).substr(-64));
            return (Array(64).join('0') + (arg).toString(16)).substr(-64);
          } else {
            return ''
          }
        })
        args = args.join('')
        return this.web3js.sha3(args, { encoding: 'hex' })
    }
*/        
    //events
    on( event, callback ) {
        this.events[event] = callback;
    } 

    initWeb3() {

        this.web3js = new Web3();
        this.web3js.setProvider(new this.web3js.providers.HttpProvider(this.config.web3HttpProvider));
        
        this.web3js.eth.getTransactionCount( this.config.reserveAccount.addr, (e, r) => {
            this.txNonce = r;
        });
            
        this.onWeb3();
        //console.log(this.config.events);
    }

    // init web3 via socket in order to read events
    initWeb3Socket() {

        this.web3Socket = new WebSocket(this.config.web3WsProvider);

        this.web3Socket.onopen = () => {
            console.log('web3 socket open');
            this.web3SocketSubscribed = false;
            this.web3Socket.send( '{"jsonrpc":"2.0", "id": 1, "method": "eth_subscribe", "params": ["newHeads"]}' );

            if (this.blockNumber) {  // do not subscribe without blockNumber
                this.web3Socket.send( '{"jsonrpc":"2.0", "id": 2, "method": "eth_subscribe", "params": ["logs", { "fromBlock": "0x1", "toBlock": "latest", \
                    "address": "'+this.config.serviceContractAddress+'"}]}' );
                    
                this.web3Socket.send( '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{ "fromBlock": "0x0", "toBlock": "latest", \
                    "address": "'+this.config.serviceContractAddress+'"}], "id": 3 }' );  // eth_getFilterLogs

                this.web3SocketSubscribed = true;
            }

            this.web3Socket.onclose = () => {
                console.log("Web3 socket connection closed");
                delete this.web3Socket;
                this.web3Socket = new WebSocket(this.config.web3WsProvider);
            };
        
            this.web3Socket.on('error', err => { console.log('web3 socket error',err) })
                
            this.web3Socket.onmessage = async (event) => {
                
                //console.log('web3 socket message');

                if (typeof(event.data) == 'string') {
                    try {
                        var data = JSON.parse(event.data);
                        if (data.id == 1) {
                            this.subscriptions['newHeads'] = data.result;

                        } else if (data.id == 2) {
                            this.subscriptions['serviceContractLogs'] = data.result;

                        } else if (data.id == 3) {
                            for (var i=0; i<data.result.length; i++) {
                                await this.dispatchEvent(data.result[i]);
                            }
                            console.log(data.result.length)
                            //"jsonrpc":"2.0", "id": 1, "method": "eth_unsubscribe", "params": ["0x9cef478923ff08bf67fde6c64013158d"]}
                            if (typeof this.events['updateOrders'] == 'function') {
                                this.events['updateOrders'](this.sellOrders, this.buyOrders);
                            }
                            if (typeof this.events['registeredNodes'] == 'function') {
                                this.events['registeredNodes'](this.registeredNodes);
                            }

                        } else {
                            if (data.params.subscription==this.subscriptions['newHeads']) {
                                var currentBlockNumber = parseInt(data.params.result.number,16);
                                this.blockNumber = currentBlockNumber;
                                if (!this.web3SocketSubscribed) {

                                    // new logs
                                    this.web3Socket.send( '{"jsonrpc":"2.0", "id": 2, "method": "eth_subscribe", "params": ["logs", { "fromBlock": "0x1", "toBlock": "latest", \
                                        "address": "'+this.config.serviceContractAddress+'"}]}' );

                                    // all logs
                                    this.web3Socket.send( '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{ "fromBlock": "0x0", "toBlock": "latest", \
                                        "address": "'+this.config.serviceContractAddress+'"}], "id": 3 }' );

                                    this.web3SocketSubscribed = true;
                                }
                                if (typeof this.events['newBlock'] == 'function') {
                                    this.events['newBlock'](this.blockNumber);
                                }
                            } else if (data.params.subscription==this.subscriptions['serviceContractLogs']) {
                                //console.log(data.params);
                                this.dispatchEvent(data.params.result);
                                this.updateAccounts();
                                if (typeof this.events['updateOrders'] == 'function') {
                                    this.events['updateOrders'](this.sellOrders, this.buyOrders);
                                }
                            }else{
                                //console.log(data);
                            }
                        }
                    } catch (e) {
                        console.log(e);
                    }
                };
            };
        };            
    };            

    // load smart contracts and account data from blockchain
    onWeb3() {
        if (this.web3js.eth) {

            //this.chargContract = this.web3js.eth.contract(this.chargAbi).at(this.config.chargContractAddress);
            //this.serviceContract = this.web3js.eth.contract(this.serviceAbi).at(this.config.serviceContractAddress);
            
            this.chargContract = new this.web3js.eth.Contract(this.chargAbi, this.config.chargContractAddress);
            this.serviceContract = new this.web3js.eth.Contract(this.serviceAbi, this.config.serviceContractAddress);

            this.web3js.eth.getBlockNumber((e, r) => {
                this.blockNumber = r;
                if (typeof this.events['newBlock'] == 'function') {
                    this.events['newBlock'](this.blockNumber);
                }
                this.updateAccounts();
            });

            this.initWeb3Socket();

            switch (this.web3js.version.network) {
                case '1':
                    this.ethNetwork = 'Mainnet';
                    break;
                case '2':
                    this.ethNetwork = 'Morden Test Network';
                    break;
                case '3':
                    this.ethNetwork = 'Ropsten Test Network';
                    break;
                case '4':
                    this.ethNetwork = 'Rinkeby Test Network';
                    break;
                case '42':
                    this.ethNetwork = 'Kovan Test Network';
                    break;
                default:
                    this.ethNetwork = 'Custom Network';
            }

            if (this.web3js.version.network !== this.config.web3Network) {
                // ask user to switch to desired network
                console.log('Please switch to desired network.');
            }

            this.serviceContract.methods.swapCoinsCount.call((err, swapCoinsCount) => {
                if (err) throw new Error('swapCoinsCount');
                var coinIdx = 0;
                for ( coinIdx=0; coinIdx<swapCoinsCount; coinIdx++ ) {
                    this.serviceContract.methods.swapCoins.call(coinIdx, (coinIdx => {
                        return (err, swapCoin) => {
                            if (err) throw new Error('swapCoins');
                            var sc = {
                                enabled: swapCoin[0],
                                fee: swapCoin[1].toFixed(3),
                                coin: swapCoin[2]
                            };
                            this.swapCoins[coinIdx] = sc;
                            if (typeof this.events['newSwapCoin'] == 'function') {
                                this.events['newSwapCoin'](coinIdx, sc);
                            }
                        }
                    })(coinIdx));
                }


                //this.serviceContract.servicesCount((err, servicesCount) => {
                this.serviceContract.methods.servicesCount.call((err, servicesCount) => {
                    if (err) throw new Error('servicesCount');
                    for (var serviceIdx=0; serviceIdx<servicesCount; serviceIdx++) {
                        var sid = serviceIdx;
                        this.serviceContract.methods.services.call(sid, (sid => { 
                            return (err, service) => {
                                if (err) throw new Error('services');
                                this.services.push(service)
                                if (typeof this.events['newService'] == 'function') {
                                    this.events['newService'](sid, service);
                                }
                            }
                        })(sid));
                    }
                }); //servicesCount

            }); //swapCoinsCount
        }
    } // onWeb3


    // update the exchange orders table and the nodes list
    async dispatchEvent(res) {
        var rate;
        
        var event = res.topics[0];
        var hash = res.topics[1];
        var sender;
    
        if (event==this.config.events.sellOrder || event==this.config.events.buyOrder) {
        
            //var give = this.web3js.utils.fromWei(parseInt(res.data.substr(2+0, 64),16).toString(), "ether");
            //var get = this.web3js.utils.fromWei(parseInt(res.data.substr(2+64, 64),16).toString(), "ether");

            var give = this.web3js.utils.fromWei('0x'+res.data.substr(2+0, 64), "ether");
            var get = this.web3js.utils.fromWei('0x'+res.data.substr(2+64, 64), "ether");
            //console.log(give);
            //console.log(get);


            //web3.utils.hexToNumberString
            
            //var expire = parseInt(res.data.substr(2+128, 64),16);
            var expire = this.web3js.utils.hexToNumber('0x'+res.data.substr(2+128, 64));
            sender = "0x" + res.data.substr(2+192+24, 40);
    
            if (expire-this.blockNumber < 5 || give==0 || get==0) {  
                return;  // empty or expired orders are ignored
            }
    
            if (event==this.config.events.sellOrder) {
    
                rate = (get/give).toFixed(7);
                this.sellOrders[hash] = {
                    give: give,
                    get: get,
                    rate: rate,
                    expire: expire,
                    hash: hash,
                    seller: sender
                };
                
            }else if (event==this.config.events.buyOrder) {
                
                rate = (give/get).toFixed(7);
                this.buyOrders[hash] = {
                    give: give,
                    get: get,
                    rate: rate,
                    expire: expire,
                    hash: hash,
                    seller: sender
                };
            }
            //checkSenderBalance(sender,hash);
    
        } else if (event==this.config.events.sell) {
    
            var give = this.web3js.utils.fromWei('0x'+res.data.substr(2+0, 64), "ether");
            var get = this.web3js.utils.fromWei('0x'+res.data.substr(2+64, 64), "ether");

            //checkSenderBalance(sender,hash);
    
            if (hash in this.buyOrders) {
                if (give==0 || get==0) {
                    delete this.buyOrders[hash];
                }else{	
                    this.buyOrders[hash].give = give;
                    this.buyOrders[hash].get = get;
                    //this.buyOrders[hash].rate = (give/get).toFixed(7);  //should not be changed, but ...
                };
            }
    
        } else if (event==this.config.events.buy) {
        
            //var give = this.web3js.utils.fromWei(parseInt(res.data.substr(2+0, 64),16).toString(), "ether");
            //var get = this.web3js.utils.fromWei(parseInt(res.data.substr(2+64, 64),16).toString(), "ether");

            var give = this.web3js.utils.fromWei('0x'+res.data.substr(2+0, 64), "ether");
            var get = this.web3js.utils.fromWei('0x'+res.data.substr(2+64, 64), "ether");
            
            if (hash in this.sellOrders) {
                if (give==0 || get==0) {
                    delete this.sellOrders[hash];
                }else{	
                    this.sellOrders[hash].give = give;
                    this.sellOrders[hash].get = get;
                    this.sellOrders[hash].rate = (get/give).toFixed(7);  //should not be changed, but ...
                    //checkSenderBalance(hash);
                };
            }
    
        } else if (event==this.config.events.cancelSell) {
    
            if (hash in this.sellOrders) {
                delete this.sellOrders[hash];
            }
        
        } else if (event==this.config.events.cancelBuy) {
    
            if (hash in this.buyOrders) {
                delete this.buyOrders[hash];
            }
    
        } else if (event==this.config.events.serviceOn) {
            // Buy event is there

        } else if (event==this.config.events.nodeRegistered || event==this.config.events.nodeModified ) {

            var node = "0x" + res.topics[1].substr(2+24, 40);
            //var latitude = (Number(res.topics[2]) / (10**7) - 10**5);
            //var longitude = (Number(res.topics[3]) / (10**7) - 10**5);
            var latitude = (Number(res.topics[2]) / (10**7) );
            var longitude = (Number(res.topics[3]) / (10**7) );


            var nodeParams = {
                'name' : { num: 0},
                'location' : { num: 1},
                'phone' : { num: 2},
                'connector' : { num: 3},
                'power' : { num: 4},
            };
            for ( var param in nodeParams ){
                nodeParams[param].start = parseInt(res.data.substr(2+64*nodeParams[param].num, 64),16) * 2 + 2;
                nodeParams[param].len = parseInt(res.data.substr(nodeParams[param].start, 64), 16) * 2;
                nodeParams[param].value = this.web3js.utils.toAscii("0x"+res.data.substr(nodeParams[param].start + 64, nodeParams[param].len));
            };

            this.registeredNodes[node] = {
                name:       nodeParams["name"].value,
                location:   nodeParams["location"].value,
                phone:      nodeParams["phone"].value,
                connector:  nodeParams["connector"].value,
                power:      nodeParams["power"].value,
                latitude:   latitude,
                longitude:  longitude
            };

        } else {
            //console.log(res);
        }

        if (Object.keys(this.sellOrders).length>0) {
            var tmpOrders = [];
            for ( var hash in this.sellOrders ){
                tmpOrders.push( this.sellOrders[ hash ] );
            }
            var newExchangeAsk = Math.min.apply(Math, tmpOrders.map( o => o.rate ));
            if (newExchangeAsk != this.exchangeAsk) {
                this.exchangeAsk = newExchangeAsk;
                //ratesChanged();
            }
        }

        if (Object.keys(this.buyOrders).length>0) {
            var tmpOrders = [];
            for ( var hash in this.buyOrders ){
                tmpOrders.push( this.buyOrders[ hash ] );
            }
            this.exchangeBid = Math.max.apply(Math, tmpOrders.map( o => o.rate ));
        }
        //console.log(event);
    
    };

    // return the best sell order
    getBestSellOrder (amountCHG=0) {
        //console.log(amountCHG);
        var bestOrder = {
            rate: Infinity,
            expire: Infinity			
        };
        var current = {};
        if (Object.keys(this.sellOrders).length>0) {
            for ( var hash in this.sellOrders ){
                current = this.sellOrders[ hash ];
                if (Number(amountCHG) <= Number(current.give)) {
                    if ((bestOrder.rate > current.rate)||(((bestOrder.rate >= current.rate)&&(bestOrder.expire > current.expire)))) {
                        bestOrder = current;
                    }
                }
            }
        }
        if (bestOrder.rate != Infinity) {
            return bestOrder;
        } else {
            return null;
        }
    };

    // return the transaction data by blockchain transaction ID
    getServiceData (paymentData, callback) {
        console.log('getServiceData', paymentData);
        this.web3js.eth.getTransactionReceipt(paymentData.txHash, (error, txData)=>{
            if (error) {
                //console.log(error, txData);
                callback(error, txData);
                return;
            }
            console.log('txData', txData);
            if (!txData || !txData.logs || !txData.blockNumber) {
                callback("Unknown error, try again later (not mined?)", paymentData);
                return;
            }
            //this.web3js.eth.getBlock(txData.blockNumber, (error, block)=>{
            for (let idx=0; idx < txData.logs.length; ++idx) {
                const log = txData.logs[idx];
                console.log(log.topics[0]);
                if(log.topics[0]==this.config.events.serviceOn) {
                    //console.log(log.data);
                    const serviceParams = {};
                    serviceParams.txHash = paymentData.txHash;
                    serviceParams.nodeAddress = '0x'+log.topics[1].substr(-40);
                    serviceParams.paymentHash = '0x'+log.data.substr(2+64, 64);
                    serviceParams.payerHash = '0x'+log.data.substr(2+64*2, 64);
                    serviceParams.serviceId = parseInt(log.data.substr(2+64*3, 64),16);
                    serviceParams.currencyId = parseInt(log.data.substr(2+64*4, 64),16);
                    serviceParams.chgAmount = parseInt(log.data.substr(2+64*5, 64),16);
                    serviceParams.serviceTime = parseInt(log.data.substr(2+64*6, 64),16);

                    console.log(paymentData.payerId, this.web3js.utils.sha3(paymentData.payerId), serviceParams.payerHash);
                    console.log(paymentData.paymentId, this.web3js.utils.sha3(paymentData.paymentId), serviceParams.paymentHash);

                    //if ( this.keccak256(paymentData.payerId)!==serviceParams.payerHash ||
                    //    this.keccak256(paymentData.paymentId, block.timestamp, serviceParams.serviceId)!==serviceParams.paymentHash ) {
                    if ( this.web3js.utils.sha3(paymentData.payerId)!==serviceParams.payerHash ||
                        this.web3js.utils.sha3(paymentData.paymentId)!==serviceParams.paymentHash ) {
                        callback("Wrong payment data", serviceParams);
                    } else {
                        callback(false, serviceParams);
                    }     
                    return;
                }            
            };
            callback('Wrong transaction', txData);
        });
    };


    // update accounts and balances
    updateAccounts() {

        var accounts = this.web3js.eth.accounts;
    
        if (accounts.length) {
            var firstAccount = accounts[0];
            if (firstAccount.substr(0, 2)!='0x') {
                firstAccount = '0x' + firstAccount;
            }
            if (this.defaultAccount != firstAccount) {
                // default account changed
                this.defaultAccount = firstAccount;
                
                if (typeof this.events['defaultAccount'] == 'function') {
                    this.events['defaultAccount'](this.defaultAccount);
                }
            }
        }

        // check the default account balances
        if (this.defaultAccount) {

            // check ETH balance
            this.web3js.eth.getBalance(this.defaultAccount, (e, r) => {
                //var bal = this.web3js.utils.fromWei(r, "ether");
                if (typeof this.events['ethBalance'] == 'function') {
                    this.events['ethBalance'](r);
                }
            });
        
            if (this.chargContract) {

                // check CHG balance
                this.chargContract.balanceOf(this.defaultAccount, (e, r) => {
                    if (typeof this.events['chgBalance'] == 'function') {
                        this.events['chgBalance'](r);
                    }
                });

                // check CHG allowance
                this.chargContract.allowance(this.defaultAccount, this.config.serviceContractAddress, (err, r) => {
                    if (typeof this.events['allowance'] == 'function') {
                        this.events['allowance'](r);
                    }
                });

                // check ETH Market balance
                this.serviceContract.ethBalance(this.defaultAccount, (e, r) => {
                    if (typeof this.events['ethMarketBalance'] == 'function') {
                        this.events['ethMarketBalance'](r);
                    }
                });

                // check CHG Market balance
                this.serviceContract.coinBalance(this.defaultAccount, (e, r) => {
                    if (typeof this.events['chgMarketBalance'] == 'function') {
                        this.events['chgMarketBalance'](r);
                    }
                });

            };
        }  // check the default account balances
    }

    registeredNode(nodeAddr, callback) {
        this.serviceContract.registeredNodes(nodeAddr, (err, nodeData) => {
            if (typeof callback == 'function') {
                callback(err, nodeData);
            }
        });
    }

    nodeService(nodeAddr, serviceIdx, callback) {
        this.serviceContract.nodeService(nodeAddr, serviceIdx, (err, nodeData) => {
            if (typeof callback == 'function') {
                callback(err, nodeData);
            }
        });
    }

    increaseApproval(value, callback) {
        this.chargContract.increaseApproval(this.config.serviceContractAddress, value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    depositCoins(value, callback) {
        this.serviceContract.depositCoins(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    depositEther(value, callback) {
        this.serviceContract.depositEther(
            { from: this.defaultAccount, value: value, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    withdrawCoins(value, callback) {
        this.serviceContract.withdrawCoins(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    withdrawEther(value, callback) {
        this.serviceContract.withdrawEther(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    buyOrder(amountGive, amountGet, expire, callback) {
        this.serviceContract.buyOrder(amountGive, amountGet, expire,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    sellOrder(amountGive, amountGet, expire, callback) {
        this.serviceContract.sellOrder(amountGive, amountGet, expire,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    buy(hash, amountGive, callback) {
        this.serviceContract.buy(hash, amountGive,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    sell(hash, amountGive, callback) {
        this.serviceContract.sell(hash, amountGive,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    registerNode( latitude, longitude, name, location, phone, connector, power, chargRate, parkRate, inetRate, callback) {
        this.serviceContract.registerNode( latitude, longitude, name, location, phone, connector, power, chargRate, parkRate, inetRate,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: 2000000}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error, result);
            }
        });
    }

    serviceOn( nodeAddress, serviceIdx, currencyId, serviceTime, orderHash, payerHash, paymentHash, ethAmount, callback) {
        this.serviceContract.serviceOn( nodeAddress, serviceIdx, currencyId, serviceTime, orderHash, payerHash, paymentHash,
            { from: this.defaultAccount, value: ethAmount, gasPrice: this.gasPrice, gas: this.gasLimit}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }
}

module.exports = DApp;