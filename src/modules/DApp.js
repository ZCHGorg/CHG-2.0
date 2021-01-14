//import Web3 from 'web3'  //may be no need to load
import config from "../app.config.json";

class DApp {

    constructor(_config, options) {

        console.log('dapp construct');

        this.erc20CoinAbi = require("../abi/ChargCoins.json");
        this.erc20ServiceAbi = require("../abi/ChargService.json");
        this.web3js = null;

        this.useLightWallet = false;
        this.defaultAccount = null;
        this.timeConvert = 3600; //from seconds to hours
        this.currency = "CHG";
    
        this.config = config;
        this.options = options;

        this.gasPrice = config.gasPrice;
        this.gasLimit = config.gasLimit;
    
        this.swapCoins = [];
        this.services = [];
        this.nodeServices = [];

        this.networkId = undefined;
        this.networkName = undefined;

        this.blockNumber = false; //ethereum
        this.blockNumberCharg = false;

        this.subscriptions = {};
    
        this.events = [];

        this.registeredNodes = [];
        this.sellOrders = [];
        this.buyOrders = [];

        this.nonce = 0;

        this.walletTypes = [/*{
            id: 0,
            name: 'Not connected'
        }*/];
        
        this.walletType = 0;

        this.initWeb3();

        if (this.options && typeof this.options.networkChanged == 'function') {
            this.events['networkChanged'] = this.options.networkChanged;
        }
    };
    
    //events
    on(event, callback) {
        this.events[event] = callback;
    } 

    changeNetwork(newNetworkId) {
        
        this.networkId = newNetworkId;

        console.log('network changed', this.events, this.networkId);

        switch (this.networkId) {
            case '1':
                this.networkName = 'Ethereum Mainnet';
                break;
            case '2':
                this.networkName = 'Morden Test Network';
                break;
            case '3':
                this.networkName = 'Ropsten Test Network';
                break;
            case '4':
                this.networkName = 'Rinkeby Test Network';
                break;
            case '42':
                this.networkName = 'Kovan Test Network';
                break;
            case '3700':
                this.networkName = 'Charg Mainnet';
                break;
            default:
                this.networkName = 'Custom Network';
        }

        //console.log(this.config);
        if (this.networkId == config.erc20Network && this.web3js ) {
            this.erc20CoinContract = this.web3js.eth.contract(this.erc20CoinAbi).at(config.erc20CoinContractAddress);
            this.erc20ServiceContract = this.web3js.eth.contract(this.erc20ServiceAbi).at(config.erc20ServiceContractAddress);
        } else {
            this.erc20CoinContract = undefined;
            this.erc20ServiceContract = undefined;
        }

        if (this.events && typeof this.events['networkChanged'] == 'function') {
            this.events['networkChanged'](this.networkId, this.networkName);
        }
    }

    // init web3 : injected app, legacy dapp browser or local lightwallet 
    initWeb3() {
        console.log('init web3');
        // Try Metamask, Nifty etc..
        if (window.ethereum) {
            this.web3js = new window.Web3(window.ethereum);
            try {
                window.ethereum.enable();
                //window.ethereum.autoRefreshOnNetworkChange = false;
                window.ethereum.on('accountsChanged', (accounts) => {
                    //console.log(accounts)
                    this.updateAccounts();
                })
                window.ethereum.on('networkChanged', this.changeNetwork);
            } catch (error) {
                // User denied account access...
                console.log('Web3 Browser error', error);
            }
            this.walletTypes.push({id: 3, name: 'Injected Wallet (Metamask)'});
            if (this.walletType==0) {
                this.walletType = 3;
            } 
            this.onWeb3();
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            this.web3js = new window.Web3(window.web3.currentProvider);
            this.walletTypes.push({id: 4, name: 'Injected DApp Wallet '});
            if (this.walletType==0) {
                this.walletType = 4;
            } 
            this.onWeb3();
        }
        else {
            // Non-dapp browsers...
            console.log('Non-Ethereum browser detected.');
            if (this.web3js && this.web3js.eth && this.web3js.eth.accounts.length) {
                console.log('Web3 unlocked already');
                return;
            }
        

        //always load light wallet
        var ref = window.document.getElementsByTagName( 'script' )[ 0 ];
        var script = window.document.createElement( 'script' );
        script.src = '/lib/web3.min.js';
        script.onload = () => {
            
            this.web3js = new window.Web3(new window.Web3.providers.HttpProvider(this.config.web3HttpProvider));
            this.onWeb3();
            
            //let's load light wallet
            var ref = window.document.getElementsByTagName( 'script' )[ 0 ];
            var script = window.document.createElement( 'script' );
            script.src = '/lib/lightwallet.min.js';
            script.onload = () => {
                this.lightWalletLoaded = true;
                this.initLightWallet();
            };
            ref.parentNode.insertBefore( script, ref );

            var script = window.document.createElement( 'script' );
            script.src = '/lib/hooked-web3-provider.min.js';
            script.onload = () => {
                this.hookedWeb3ProviderLoaded = true;
                this.initLightWallet();
            };
            ref.parentNode.insertBefore( script, ref );
        };
        ref.parentNode.insertBefore( script, ref );
        }
    }

    // init web3 via socket in order to read events
    initWeb3Socket() {

        this.web3Socket = new WebSocket(this.config.web3WsProvider);

        this.web3Socket.onopen = () => {

            this.web3SocketSubscribed = false;
            this.web3Socket.send( '{"jsonrpc":"2.0", "id": 1, "method": "eth_subscribe", "params": ["newHeads"]}' );

            if (this.blockNumber) {  // do not subscribe without blockNumber
                this.web3Socket.send( '{"jsonrpc":"2.0", "id": 2, "method": "eth_subscribe", "params": ["logs", { "fromBlock": "0x1", "toBlock": "latest", \
                    "address": "'+this.config.erc20ServiceContractAddress+'"}]}' );
                this.web3Socket.send( '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{ "fromBlock": "0x0", "toBlock": "latest", \
                    "address": "'+this.config.erc20ServiceContractAddress+'"}], "id": 3 }' );
                this.web3SocketSubscribed = true;
            }

            this.web3Socket.onclose = () => {
                console.log("Web3 socket connection closed");
                delete this.web3Socket;
                this.web3Socket = new WebSocket(this.config.web3WsProvider);
            };
        
            //this.web3Socket.on('error', err => { console.log(err) })
                
            this.web3Socket.onmessage = (event) => {
                if (typeof(event.data) == 'string') {
                    try {
                        var data = JSON.parse(event.data);
                        if (data.id == 1) {
                            this.subscriptions['newHeads'] = data.result;
                        } else if (data.id == 2) {
                            this.subscriptions['serviceContractLogs'] = data.result;
                        } else if (data.id == 3) {
                            for (var i=0; i<data.result.length; i++) {
                                this.dispatchEvent(data.result[i]);
                            }
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
                                        "address": "'+this.config.erc20ServiceContractAddress+'"}]}' );
                                    // all logs
                                    this.web3Socket.send( '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{ "fromBlock": "0x0", "toBlock": "latest", \
                                        "address": "'+this.config.erc20ServiceContractAddress+'"}], "id": 3 }' );

                                    this.web3SocketSubscribed = true;
                                }
                                if (typeof this.events['newBlock'] == 'function') {
                                    this.events['newBlock'](this.blockNumber);
                                }
                                if (typeof this.events['defaultAccount'] == 'function') {
                                    this.updateAccounts()
                                }
                            } else if (data.params.subscription==this.subscriptions['serviceContractLogs']) {
                                this.dispatchEvent(data.params.result);
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

        this.web3charg = new window.Web3(new window.Web3.providers.HttpProvider(this.config.web3HttpChargProvider));
        this.web3ether = new window.Web3(new window.Web3.providers.HttpProvider(this.config.web3HttpEtherProvider));

        if (this.web3charg.eth) {
            //this.chargServiceContract = this.web3charg.eth.contract(this.chargServiceAbi).at(this.config.chargServiceContractAddress);
            //this.chargBridgeContract = this.web3charg.eth.contract(this.chargBridgeAbi).at(this.config.chargBridgeContractAddress);

            this.web3charg.eth.getBlockNumber((e, r) => {
                this.blockNumberCharg = r;
                if (typeof this.events['newChargBlock'] == 'function') {
                    this.events['newChargBlock'](this.blockNumberCharg);
                }
                this.updateAccounts();
            });
        }

        if (this.web3ether.eth) {

            this.erc20CoinReadContract = this.web3ether.eth.contract(this.erc20CoinAbi).at(this.config.erc20CoinContractAddress);
            this.erc20ServiceReadContract = this.web3ether.eth.contract(this.erc20ServiceAbi).at(this.config.erc20ServiceContractAddress);
            //this.erc20BridgeContract = this.web3ether.eth.contract(this.erc20BridgeAbi).at(this.config.erc20BridgeContractAddress);

            this.web3ether.eth.getBlockNumber((e, r) => {
                this.blockNumber = r;
                if (typeof this.events['newBlock'] == 'function') {
                    this.events['newBlock'](this.blockNumber, "ether");
                }
                this.updateAccounts();
            });

            this.erc20ServiceReadContract.swapCoinsCount((err, swapCoinsCount) => {
                if (err) throw new Error('swapCoinsCount');
                var coinIdx = 0;
                for ( coinIdx=0; coinIdx<swapCoinsCount; coinIdx++ ) {
                    this.erc20ServiceReadContract.swapCoins(coinIdx, (coinIdx => {
                        return (err, swapCoin) => {
                            if (err) throw new Error('swapCoins');
                            var sc = {
                                enabled: swapCoin[0],
                                fee: swapCoin[1].toFixed(3),
                                coin: swapCoin[2]
                            };
                            this.swapCoins[coinIdx] = sc;
                            if (typeof this.events['newSwapCoin'] == 'function') {
                                this.events['newSwapCoin'](sc);
                            }
                        }
                    })(coinIdx));
                }


                this.erc20ServiceReadContract.servicesCount((err, servicesCount) => {
                    if (err) throw new Error('servicesCount');
                    for (var serviceIdx=0; serviceIdx<servicesCount; serviceIdx++) {
                        var sid = serviceIdx;
                        this.erc20ServiceReadContract.services(sid, (err, service) => {
                            if (err) throw new Error('services');
                            this.services.push(service)
                            if (typeof this.events['newService'] == 'function') {
                                this.events['newService'](service);
                            }
                        });
    
                        if (this.options.nodeAddress !== undefined) {
                            this.erc20ServiceReadContract.nodeService(this.options.nodeAddress, sid, (err, nodeData) => {
                                if (err) throw new Error('nodeService');
                                this.nodeServices.push(nodeData)
                                if (typeof this.events['newNodeService'] == 'function') {
                                    this.events['newNodeService'](err, nodeData);
                                }
                            });
                        }
                    }

                    if (this.options.nodeAddress !== undefined) {
                        // is node registered ?
                        this.erc20ServiceReadContract.registeredNodes(this.options.nodeAddress, (err, registeredNode) => {
                            if (typeof this.events['registeredNode'] == 'function') {
                                this.events['registeredNode'](err, registeredNode);
                            }
                        });
                    }
        
                }); //servicesCount

            }); //swapCoinsCount
        }


        // our current network
        if (this.web3js.eth) {

            //console.log(this.web3js.version.network, this.web3js.version, this.config.web3Network);
            if (this.web3js.version.network && this.web3js.version.network!==this.networkId) {
                this.changeNetwork(this.web3js.version.network)
            }
            
        }


        /*
        setInterval(() => {
            //console.log(this.blockNumber, this.defaultAccount)
            this.updateAccounts()
        }, 5000); //update accounts
        */

        // init events
        this.initWeb3Socket();

    } // onWeb3



    
    // set hooked web3 provider for the lightwallet account
    setHookedWeb3Provider(keystore, provider=undefined) {
        try {
            var web3Provider = new window.HookedWeb3Provider({
                host: provider==undefined ? this.config.web3HttpProvider : provider,
                transaction_signer: keystore
            });
            this.web3js.setProvider(web3Provider);
        } catch (e) {
            console.log("HookedWeb3Provider error ", e);
        }
    }

    // try to load lightwallet
    initLightWallet() {
        if (this.hookedWeb3ProviderLoaded && this.lightWalletLoaded) {
            try {
                //localKeyStore = JSON.parse(localStorage.getItem('localKeyStore'));
                this.keystore = window.lightwallet.keystore.deserialize(localStorage.getItem('localKeyStore'));
                this.keystore.passwordProvider = this.options.hookedPasswordProvider;

                this.useLightWallet = true;
                this.updateAccounts();

                if (typeof this.events['lightWallet'] == 'function') {
                    this.events['lightWallet'](false);
                }
            } catch (e) {
                console.log('No wallet in the local store', e);
                this.secretSeed = window.lightwallet.keystore.generateRandomSeed();
                if (typeof this.events['lightWallet'] == 'function') {
                    this.events['lightWallet'](e, this.secretSeed);
                }
            }
        }
    }

    // create a new lightwallet account
    createLightWalletAccount(password) {

        window.lightwallet.keystore.createVault({
            password: password,
            seedPhrase: this.secretSeed, 
            //salt: fixture.salt,     // Optionally provide a salt. A unique salt will be generated otherwise.
            hdPathString: "m/0'/0'/0'"
        },  (err, ks) => {
            console.log(err, ks);
            if (!err) {
                this.keystore = ks;
                // Some methods will require providing the `pwDerivedKey`,
                // Allowing you to only decrypt private keys on an as-needed basis.
                // You can generate that value with this convenient method:
                this.keystore.keyFromPassword(password, (err, pwDerivedKey) => {
                    if (err) throw err;
                    // generate new address/private key pair
                    // the corresponding private keys are also encrypted
                    this.keystore.generateNewAddress(pwDerivedKey, 1);

                    localStorage.setItem('localKeyStore', this.keystore.serialize());
                    this.setHookedWeb3Provider(this.keystore);
                    
                    this.keystore.passwordProvider = this.options.hookedPasswordProvider;
                    this.useLightWallet = true;
                    this.updateAccounts();
                });
            }
        });	
    };

    // load the lightwallet account by seed
    loadLightWalletAccount(password, seed) {
        this.secretSeed = seed;
        this.createLightWalletAccount(password);
    }



    // update the exchange orders table and the nodes list
    dispatchEvent(res) {
        var rate;
        
        var event = res.topics[0];
        var hash = res.topics[1];
        var sender;
    
        if (event==this.config.sellOrderEvent || event==this.config.buyOrderEvent) {
        
            var give = this.web3ether.fromWei(parseInt(res.data.substr(2+0, 64),16).toString(), "ether");
            var get = this.web3ether.fromWei(parseInt(res.data.substr(2+64, 64),16).toString(), "ether");
            
            var expire = parseInt(res.data.substr(2+128, 64),16);
            sender = "0x" + res.data.substr(2+192+24, 40);
    
            if (expire-this.blockNumber < 5 || give==0 || get==0) {  
                return;  // empty or expired orders are ignored
            }
    
            if (event==this.config.sellOrderEvent) {
    
                rate = (get/give).toFixed(7);
                this.sellOrders[hash] = {
                    give: give,
                    get: get,
                    rate: rate,
                    expire: expire,
                    hash: hash,
                    seller: sender
                };
                
            }else if (event==this.config.buyOrderEvent) {
                
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
    
        } else if (event==this.config.sellEvent) {
    
            var give = this.web3ether.fromWei(parseInt(res.data.substr(2+0, 64),16).toString(), "ether");
            var get = this.web3ether.fromWei(parseInt(res.data.substr(2+64, 64),16).toString(), "ether");
            
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
    
        } else if (event==this.config.buyEvent) {
        
            var give = this.web3ether.fromWei(parseInt(res.data.substr(2+0, 64),16).toString(), "ether");
            var get = this.web3ether.fromWei(parseInt(res.data.substr(2+64, 64),16).toString(), "ether");
    
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
    
        } else if (event==this.config.cancelSellEvent) {
    
            if (hash in this.sellOrders) {
                delete this.sellOrders[hash];
            }
        
        } else if (event==this.config.cancelBuyEvent) {
    
            if (hash in this.buyOrders) {
                delete this.buyOrders[hash];
            }
    
        } else if (event==this.config.serviceOnEvent) {
            // Buy event is there

        } else if (event==this.config.nodeRegisteredEvent || event==this.config.nodeModifiedEvent ) {

            var node = "0x" + res.topics[1].substr(2+24, 40);
            var latitude = (Number(res.topics[2]) / (10**7) - 10**5);
            var longitude = (Number(res.topics[3]) / (10**7) - 10**5);

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
                nodeParams[param].value = this.web3ether.toAscii("0x"+res.data.substr(nodeParams[param].start + 64, nodeParams[param].len));
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
    
    };

    // return the best sell order
    getBestSellOrder (amountCHG=0) {

        var bestOrder = {
            rate: Infinity,
            expire: Infinity			
        };
        var current = {};
        if (Object.keys(this.sellOrders).length>0) {
            for ( var hash in this.sellOrders ){
                current = this.sellOrders[ hash ];
                if (amountCHG <= current.give) {
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

    // update accounts and balances
    updateAccounts() {

        let accounts = [];

        if ([3,4].includes(this.walletType)) {
            accounts = this.web3js.eth.accounts;
        }
    
        if (!accounts.length && this.keystore !== undefined) {
            accounts = this.keystore.addresses;

            if (!this.walletTypes.find(t=>t.id==1)) {
                this.walletTypes.push({
                    id: 1,
                    name: 'Charg Light Wallet'
                })
                this.walletTypes.push({
                    id: 2,
                    name: 'Ethereum Light Wallet'
                });
                if (this.walletType==0) {
                    this.setHookedWeb3Provider(this.keystore, this.config.web3HttpEtherProvider);
                    this.walletType = 2;
                }
            }
        }
    
        if (accounts.length) {
            var firstAccount = accounts[0];
            if (firstAccount.substr(0, 2)!='0x') {
                firstAccount = '0x' + firstAccount;
            }
            if (this.defaultAccount != firstAccount) {
                // default account changed
                this.defaultAccount = firstAccount;

                this.web3js.eth.getTransactionCount(this.defaultAccount, this.web3js.defaultBlock, (error, count)=>{
                    if (!error) {
                        console.log("nonce, count", this.nonce, count, this.defaultAccount);
                        this.nonce = count;
                    }
                });
                
                if (typeof this.events['defaultAccount'] == 'function') {
                    this.events['defaultAccount'](this.defaultAccount);
                }
            }
        }

        // check the default account balances
        if (this.defaultAccount) {

            // check CHARG balance
            this.web3charg.eth.getBalance(this.defaultAccount, (e, r) => {
                //var bal = this.web3js.fromWei(r, "ether");
                if (typeof this.events['chargBalance'] == 'function') {
                    this.events['chargBalance'](this.web3charg.fromWei(r,"ether"));
                }
            });

            // check ETH balance
            this.web3ether.eth.getBalance(this.defaultAccount, (e, r) => {
                //var bal = this.web3js.fromWei(r, "ether");
                if (typeof this.events['ethBalance'] == 'function') {
                    this.events['ethBalance'](this.web3ether.fromWei(r,"ether"));
                }
            });
        
            if (this.erc20CoinReadContract) {

                // check CHG balance
                this.erc20CoinReadContract.balanceOf(this.defaultAccount, (e, r) => {
                    if (typeof this.events['chgBalance'] == 'function') {
                        this.events['chgBalance'](this.web3ether.fromWei(r,"ether"));
                    }
                });

                // check CHG allowance
                this.erc20CoinReadContract.allowance(this.defaultAccount, this.config.erc20ServiceContractAddress, (err, r) => {
                    if (typeof this.events['allowance'] == 'function') {
                        this.events['allowance'](this.web3js.fromWei(r,"ether"));
                    }
                });

                // check ETH Market balance
                this.erc20ServiceReadContract.ethBalance(this.defaultAccount, (e, r) => {
                    if (typeof this.events['ethMarketBalance'] == 'function') {
                        this.events['ethMarketBalance'](this.web3js.fromWei(r,"ether"));
                    }
                });

                // check CHG Market balance
                this.erc20ServiceReadContract.coinBalance(this.defaultAccount, (e, r) => {
                    if (typeof this.events['chgMarketBalance'] == 'function') {
                        this.events['chgMarketBalance'](this.web3js.fromWei(r,"ether"));
                    }
                });

            };
        }  // check the default account balances
    }

    contractError(callback) {
        callback("please choose correct network");
    }

    registeredNode(nodeAddr, callback) {
        this.erc20ServiceReadContract.registeredNodes(nodeAddr, (err, nodeData) => {
            if (typeof callback == 'function') {
                callback(err, nodeData);
            }
        });
    }

    nodeService(nodeAddr, serviceIdx, callback) {
        this.erc20ServiceReadContract.nodeService(nodeAddr, serviceIdx, (err, nodeData) => {
            if (typeof callback == 'function') {
                callback(err, nodeData);
            }
        });
    }

    increaseApproval(value, callback) {
        if (!this.erc20CoinContract) {
            this.contractError(callback);
            return;
        }
        this.erc20CoinContract.increaseApproval(this.config.erc20ServiceContractAddress, value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    depositCoins(value, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        //console.log({ from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: this.nonce});
        this.erc20ServiceContract.depositCoins(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    depositEther(value, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.depositEther(
            { from: this.defaultAccount, value: value, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    withdrawCoins(value, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.withdrawCoins(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    withdrawEther(value, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.withdrawEther(value,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    buyOrder(amountGive, amountGet, expire, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.buyOrder(amountGive, amountGet, expire,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    sellOrder(amountGive, amountGet, expire, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.sellOrder(amountGive, amountGet, expire,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    buy(hash, amountGive, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.buy(hash, amountGive,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    sell(hash, amountGive, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.sell(hash, amountGive,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    cancelBuyOrder(hash, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.cancelBuyOrder(hash,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    cancelSellOrder(hash, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.cancelSellOrder(hash,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }

    registerNode( latitude, longitude, name, location, phone, connector, power, chargRate, parkRate, inetRate, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.registerNode( latitude, longitude, name, location, phone, connector, power, chargRate, parkRate, inetRate,
            { from: this.defaultAccount, value: 0, gasPrice: this.gasPrice, gas: 2000000, nonce: ++this.nonce}, (error,result) => {
            if (typeof callback == 'function') {
                callback(error, result);
            }
        });
    }

    serviceOn( nodeAddress, serviceIdx, currencyId, serviceTime, orderHash, payerHash, paymentHash, ethAmount, callback) {
        if (!this.erc20ServiceContract) {
            this.contractError(callback);
            return;
        }
        this.erc20ServiceContract.serviceOn( nodeAddress, serviceIdx, currencyId, serviceTime, orderHash, payerHash, paymentHash,
            { from: this.defaultAccount, value: ethAmount, gasPrice: this.gasPrice, gas: this.gasLimit, nonce: ++this.nonce}, (error,result) => {
                //console.log({ from: this.defaultAccount, value: ethAmount, gasPrice: this.gasPrice, gas: this.gasLimit});
            if (typeof callback == 'function') {
                callback(error,result);
            }
        });
    }
}

export default DApp;