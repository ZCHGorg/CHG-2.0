const config = require('../config');
//const http = require(config.server.protocol);
const http = require('https');
//const Tx = require('ethereumjs-tx');
const Tx = require('ethereumjs-tx').Transaction
const Web3 = require('web3');

var fs = require('fs');
var path = require('path');

const braintree = require('braintree');
config.braintreeOptions.environment = braintree.Environment[config.braintreeOptions.environment];
const braintreeGateway = braintree.connect(config.braintreeOptions);

const TRANSACTION_SUCCESS_STATUSES = [
  braintree.Transaction.Status.Authorizing,
  braintree.Transaction.Status.Authorized,
  braintree.Transaction.Status.Settled,
  braintree.Transaction.Status.Settling,
  braintree.Transaction.Status.SettlementConfirmed,
  braintree.Transaction.Status.SettlementPending,
  braintree.Transaction.Status.SubmittedForSettlement
];

const BitcoinCore = require('bitcoin-core');
const bitcoinCore = new BitcoinCore(config.bitcoinOptions);
const litecoinCore = new BitcoinCore(config.litecoinOptions);

var paymentGateway = {};

const baseDir = path.join(__dirname,'/../../.data/');
const dir = '';

paymentGateway.transactionStatus = {
    UNKNOWN: '0',
    STARTED: '1',
    CONFIRMED: '2'
};

paymentGateway.coinTransactions = {};

paymentGateway.getBitcoinAddress = function(callback){
    bitcoinCore.getNewAddress().then((addressBTC) => {
        paymentGateway.coinTransactions[addressBTC] = paymentGateway.transactionStatus.STARTED;

        console.log(baseDir+dir+'/'+addressBTC+'.txt');

        fs.open(baseDir+dir+'/'+addressBTC+'.txt', 'wx', function(err, fileDescriptor){
            if(!err && fileDescriptor){
              fs.writeFile(fileDescriptor, paymentGateway.transactionStatus.STARTED, function(err){
                if(!err){
                  fs.close(fileDescriptor,function(err){
                      if (err) console.log (err);
                  });
                } else {
                    console.log (err);
                }
              });
            } else {
                console.log('Could not create new file, it may already exist', err);
            }
        });

        callback( false, { address: addressBTC });
    });
};

paymentGateway.checkBitcoinPayment = function(paymentData, callback){
    var address = paymentData.paymentId;
    var amount = paymentData.amount;

    if (paymentGateway.coinTransactions[paymentData.paymentId]==undefined) {
        try {
            fs.readFile(baseDir+dir+'/'+paymentData.paymentId+'.txt', 'utf8', function(err,data){
                if(!err && data){
                    paymentGateway.coinTransactions[paymentData.paymentId] = data;
                }
            });
        } catch (e) {
            console.log(e)
        }
    }    
    
    console.log(paymentData.paymentId, paymentGateway.coinTransactions[paymentData.paymentId]);

    if (paymentGateway.coinTransactions[paymentData.paymentId]!==paymentGateway.transactionStatus.STARTED) {
        if (paymentGateway.coinTransactions[paymentData.paymentId]) {
            callback(false, {result: 'The transaction is confirmed!', txHash: paymentGateway.coinTransactions[paymentData.paymentId]})
        } else {
            callback(false, {error: 'Wrong payment data!', details: paymentGateway.coinTransactions[paymentData.paymentId]})
        }
        return;
    };

    //Promise.all([bitcoinCore.getReceivedByAddress(address), bitcoinCore.getUnconfirmedBalance()]).then(([balance, unconfirmed]) => {
    bitcoinCore.getReceivedByAddress(address).then((balance)=>{
        console.log('balance', balance);
        let unconfirmed = 0
        //console.log('unconfirmed', unconfirmed); //should be checked later if it is confirmed
        balance = balance + unconfirmed;
        //if (balance >= amount) {
        if (balance > 0) {
            amount = balance;
            var amountEth = amount / paymentGateway.currentRates["BTC"];
            console.log(amountEth, paymentGateway.currentRates["BTC"]);
            paymentData.amountEth = amountEth;
            paymentData.currencyId = 2; //BTC

            if (paymentData.station) {
                    paymentGateway.serviceOn(paymentData, (error, result)=>{
                    if (!error) {
                        paymentGateway.coinTransactions[paymentData.paymentId] = result;
                        callback(false, {txHash: result});
                    } else {
                        callback(error, result);
                    }    
                });
            } else {
                paymentGateway.payToAddress(paymentData, callback);
            }
        } else {
            callback(false, {error: `Not paid yet ( ${balance} of ${amount.toFixed(5)} ), please try again later`});
        };
    }, (error) => {
        console.log(error)
        callback(error);
    });
};


paymentGateway.getLitecoinAddress = function(callback) {
    console.log('get LTC addr');
    litecoinCore.getNewAddress().then((addressLTC) => {
        paymentGateway.coinTransactions[addressLTC] = paymentGateway.transactionStatus.STARTED;

        console.log(baseDir+dir+'/'+addressLTC+'.txt');

        fs.open(baseDir+dir+'/'+addressLTC+'.txt', 'wx', function(err, fileDescriptor){
            if(!err && fileDescriptor){
              fs.writeFile(fileDescriptor, paymentGateway.transactionStatus.STARTED, function(err){
                if(!err){
                  fs.close(fileDescriptor,function(err){
                      if (err) console.log (err);
                  });
                } else {
                    console.log (err);
                }
              });
            } else {
                console.log('Could not create new file, it may already exist', err);
            }
        });
    
        callback( false, { address: addressLTC });
    });
};

paymentGateway.checkLitecoinPayment = function(paymentData, callback){

    var address = paymentData.paymentId;
    var amount = paymentData.amount;
    
    if (paymentGateway.coinTransactions[paymentData.paymentId]==undefined) {
        try {
            fs.readFile(baseDir+dir+'/'+paymentData.paymentId+'.txt', 'utf8', function(err,data){
                if(!err && data){
                    paymentGateway.coinTransactions[paymentData.paymentId] = data;
                }
            });
        } catch (e) {
            console.log(e)
        }
    }    
    
    console.log(paymentData.paymentId, paymentGateway.coinTransactions[paymentData.paymentId]);
    
    if (paymentGateway.coinTransactions[paymentData.paymentId]!==paymentGateway.transactionStatus.STARTED) {
        if (paymentGateway.coinTransactions[paymentData.paymentId]) {
            callback(false, {result: 'The transaction is confirmed!', txHash: paymentGateway.coinTransactions[paymentData.paymentId]})
        } else {
            callback(false, {error: 'Wrong payment data!', details: paymentGateway.coinTransactions[paymentData.paymentId]})
        }
        return;
    };

    litecoinCore.getReceivedByAddress(address).then((balance)=>{
    //litecoinCore.getUnconfirmedBalance().then((balance)=>{
        console.log('balance', balance);
        //if (balance >= amount) {
        if (balance > 0) {
            amount = balance;
            var amountEth = amount / paymentGateway.currentRates["LTC"];
            console.log('eth', amountEth, paymentGateway.currentRates["LTC"], paymentGateway.currentRates);
            paymentData.amountEth = amountEth;
            paymentData.currencyId = 3; //LTC
            if (paymentData.station) {
                paymentGateway.serviceOn(paymentData, (error, result)=>{
                    if (!error) {
                        paymentGateway.coinTransactions[paymentData.paymentId] = result;
                        callback(false, {txHash: result});
                    } else {
                        callback(error, result);
                    }    
                });
            } else {
                paymentGateway.payToAddress(paymentData, callback);
            }

        } else {
            callback(false, {error: `Not paid yet ( ${balance} of ${amount.toFixed(7)} ), please try again later`});
        };
    }, (error) => {
        console.log(error)
        callback(error);
    });
};


paymentGateway.getBraintreeToken = function(callback){
    braintreeGateway.clientToken.generate({}, callback);
};


paymentGateway.payBraintree = function(paymentData, callback){

    var nonce = paymentData.paymentId;
    var amountUSD = paymentData.amount;

/*
    // check balances first
    Promise.all([
//		exchangeContract.methods.sellOrders(paymentData.hash).call(),
        web3.eth.getBalance(config.reserveAccount.addr),
        chargeContract.methods.balanceOf(config.reserveAccount.addr).call(),
        exchangeContract.methods.ethBalance(config.reserveAccount.addr).call(),
        exchangeContract.methods.coinBalance(config.reserveAccount.addr).call(),
        exchangeContract.methods.ethBalance(paymentData.seller).call(),
        exchangeContract.methods.coinBalance(paymentData.seller).call()
    ]).then((results) => {
        const [ accEthBalance, accChgBalance, exchEthBalance, exchChgBalance, sellerEthBalance, sellerChgBalance] = results;

        debugMessage("res",results);
*/
        //calculate amount in Wei
        //var giveWei = new BigNumber(orderData.amountGive);
        //var getWei = new BigNumber(orderData.amountGet);
        //var orderRate = getWei.dividedBy(giveWei);

        //var amountTmbBN = new BigNumber(amountUSD * 100);
        //var amountEth = amountTmbBN.dividedBy(currentRates.ETH).dividedBy(100+config.fees.USD);
        
        //console.log(amountUSD, config.fees.USD, currentRates.ETH);
        //console.log(amountUSD, config.fees, currentRates);

        console.log(amountUSD);

        var amountEth = (amountUSD / paymentGateway.currentRates["USD"]);
        console.log(amountEth);

        //var amountWei = web3.utils.toWei(amountEth.toFixed(14), "ether");
        //console.log(amountWei);
        //paymentData.amountWei = amountWei;

        // check if CHG seller has enough tokens
        
        var transactData = {
            amount: amountUSD,
            paymentMethodNonce: nonce,
            options: {
              submitForSettlement: true
              //orderId: data.key
            }
            //customerId: data.key
                //options: {
                //submitForSettlement: false,
                //storeInVaultOnSuccess: true,
                //orderId: data.key
            //}
        };
  
        // pay USD via braintree payment gateway
        braintreeGateway.transaction.sale(transactData, function (err, result) {
            if (result && result.success && result.transaction) {
                braintreeGateway.transaction.find(result.transaction.id, function (err, transaction) {
                    if (TRANSACTION_SUCCESS_STATUSES.indexOf(transaction.status) !== -1) {
                        paymentData.amountEth = amountEth;
                        //console.log(transaction);
                        //paymentData.paymentId = transaction.id;
                        paymentData.currencyId = 4; //USD
                        paymentGateway.serviceOn(paymentData, (error, result)=>{
                            if (!error) {
                                //paymentGateway.tradeData.coinTransactions[paymentData.paymentId] = result;
                                callback(false, {txHash: result});
                            } else {
                                callback(error, result);
                            }    
                        });
                    } else {
                        callback(true, {error: 'Card payment failed', transaction: transaction});
                    }
                });
            } else {
                //transactionErrors = result.errors.deepErrors();
                //resp({err: true, result: result, msg: formatErrors(transactionErrors)});
                callback(true, result);
            }
        }); // braintree payment
        
    //});	//check balances
    
}; // payBraintree


paymentGateway.getPaymentData = function(currency, callback){
    if (currency=='USD') {
        this.getBraintreeToken(callback);
    } else if (currency=='BTC') {
        this.getBitcoinAddress(callback);
    } else if (currency=='LTC') {
        this.getLitecoinAddress(callback);
    } else {
        callback(true, {result: 'Not supported'});
    }
};


paymentGateway.confirmPayment = function(data, callback){
    console.log('paymentGateway.confirmPayment');
    if (data.currency=='USD') {
        this.payBraintree(data, callback);
    } else if (data.currency=='BTC') {
        this.checkBitcoinPayment(data, callback);
    } else if (data.currency=='LTC') {
        this.checkLitecoinPayment(data, callback);
    } else {
        callback(true, {result: 'Not supported'});
    }
};

paymentGateway.payToAddress = (paymentData, callback) => {

    this.web3js = new Web3(config.nativeWeb3HttpProvider);
    //this.web3js.setProvider(new this.web3js.providers.HttpProvider(config.nativeWeb3HttpProvider));

    this.web3js.eth.getTransactionCount( config.reserveAccount.addr, (e, r) => {
        this.txNonce = r;
        console.log('txNonce',this.txNonce);
        const privateKey = new Buffer(config.reserveAccount.pk, 'hex');
        const bestOrder = paymentGateway.dappModule.getBestSellOrder(paymentData.chgAmount || 10);
        console.log(bestOrder);

        paymentData.amountChg = paymentData.chgAmount;
        if (bestOrder && bestOrder.rate) {
            paymentData.amountChg = paymentData.amountEth/bestOrder.rate;
        }
        console.log(paymentData);
        
        var amountWei = this.web3js.utils.toWei(paymentData.amountChg.toString(), 'ether');
        console.log('txNonce', paymentGateway.txNonce);
        var txOptions = {
            //chainId: 4,
            //nonce: paymentGateway.txNonce++,
            nonce: this.txNonce,
            gasPrice: this.web3js.utils.toHex(config.gasPrice),
            gasLimit: this.web3js.utils.toHex(config.gasLimit),
            from: config.reserveAccount.addr,
            to: paymentData.payer,
            //value: (new BigNumber(String(amountWei))),
            value: (1*amountWei),
            //value: 10**16,
            //data: txData
        }
        console.log(txOptions);
        //tradeData.exchangeContract.chargOn.sendTransaction(paymentData.station, paymentData.orderHash, txOptions, function(e, r){
        //	console.log('sendTransaction' ,e, r);
        //});
    
        const tx = new Tx(txOptions);
        tx.sign(privateKey);
        const rawTx = `0x${tx.serialize().toString('hex')}`;
    
        //this.web3js.eth.sendRawTransaction(rawTx, callback);
        this.web3js.eth.sendSignedTransaction(rawTx,  (error, result)=>{
            if (!error) {
                paymentGateway.coinTransactions[paymentData.paymentId] = result;
                fs.open(baseDir+dir+'/'+paymentData.paymentId+'.txt', 'r+', function(err, fileDescriptor){
                    if(!err && fileDescriptor){
                      // Truncate the file
                      fs.truncate(fileDescriptor,function(err){
                        if(!err){
                          // Write to file and close it
                          fs.writeFile(baseDir+dir+'/'+paymentData.paymentId+'.txt', result,function(err){
                            if(!err){
                              fs.close(fileDescriptor,function(err){
                                if(err) console.log(err);
                              });
                            } else {
                                console.log('Error writing to existing file');
                            }
                          });
                        } else {
                            console.log('Error truncating file');
                        }
                      });
                    } else {
                        console.log('Could not open file for updating, it may not exist yet');
                    }
                });
                callback(false, {txHash: result});
            } else {
                callback(error, result);
            }    
        });
    });

}

paymentGateway.serviceOn = (paymentData, callback) => {

	const privateKey = new Buffer(config.reserveAccount.pk, 'hex');

	paymentData.payerHash = paymentGateway.dappModule.web3js.utils.sha3(paymentData.payerId);
	paymentData.paymentHash = paymentGateway.dappModule.web3js.utils.sha3(paymentData.paymentId);
    
	console.log(paymentData);
	var amountWei = paymentGateway.dappModule.web3js.utils.toWei(paymentData.amountEth, 'ether')
	
	console.log(amountWei);
	console.log('paymentData.paymentHash', paymentData.paymentHash);
	//console.log(paymentData.station, paymentData.orderHash, paymentData.swapHash, paymentData.payerHash, paymentData.serviceId, paymentData.currencyId);

	var txData = paymentGateway.dappModule.serviceContract.serviceOn.getData(
		paymentData.station, 
		paymentData.serviceId, 
		paymentData.currencyId,
		0, // time will be calculated in the smart contract
		paymentData.orderHash, 
		paymentData.payerHash, 
		paymentData.paymentHash 
	);
	//console.log(txData);
	console.log('txNonce', paymentGateway.txNonce);

	var txOptions = {
		//chainId: 4,
		nonce: paymentGateway.txNonce++,
		gasPrice: paymentGateway.dappModule.web3js.utils.toHex(config.gasPrice),
		gasLimit: paymentGateway.dappModule.web3js.utils.toHex(config.gasLimit),
		from: config.reserveAccount.addr,
		to: config.serviceContractAddress,
		//value: (new BigNumber(String(amountWei))),
		value: (1*amountWei),
		//value: 10**16,
		data: txData
	}
	console.log(txOptions);

	//tradeData.exchangeContract.chargOn.sendTransaction(paymentData.station, paymentData.orderHash, txOptions, function(e, r){
	//	console.log('sendTransaction' ,e, r);
	//});

	const tx = new Tx(txOptions);
	tx.sign(privateKey);
	const rawTx = `0x${tx.serialize().toString('hex')}`;

	paymentGateway.dappModule.web3js.eth.sendRawTransaction(rawTx, callback);
		/*  function(err, txHash){
		console.log('sendRawTransaction', err, txHash, paymentData.paymentId);
		if (!err) tradeData.coinTransactions[paymentData.paymentId] = txHash;
		callback(err, {txHash: txHash});
	});*/

	/*
	.on('transactionHash', function (txHash) {
		console.log(txHash);
		//respToClient({status:'created', receipt:hash});
	})
	.on('receipt', function (receipt) {
		console.log(receipt);
		//respToClient({status:'pending', receipt:receipt});
		//return receipt;
	})
	.on('confirmation', function (confirmationNumber, receipt) {
		if (confirmationNumber==1) {
			debugMessage("", confirmationNumber, receipt);
			respToClient({status:'confirmed', receipt:receipt});
		 }
	})
	.on('error', (e) => {
		callback(e)
	});	
	*/
};


paymentGateway.updateRates = () => {
	http.get(config.ratesUrl, (resp) => {
		var data = '';
		resp.on('data', (chunk) => {
			data += chunk;
		});
		resp.on('end', () => {
			
			try {
				var result = JSON.parse(data);
				paymentGateway.currentRates = result;
				//paymentGateway.currentRates['ETH'] = 1;
			} catch (e) {
				console.log(e);
			}

		});
	}).on("error", (err) => {
		console.log("Update rates error: ", new Date(), err.message);
	});
};


paymentGateway.init = function(dappModule) {
    paymentGateway.dappModule = dappModule;
    paymentGateway.dappModule.web3js.eth.getTransactionCount( config.reserveAccount.addr, (e, r) => {
        console.log('txNonce', e, r);
        paymentGateway.txNonce = r;
    });
	paymentGateway.updateRates();
	paymentGateway.rateInterval = setInterval(paymentGateway.updateRates, config.updateRatesInterval);
    return this;
}
module.exports = paymentGateway;
