require('dotenv').config();
const request = require('request-promise-native');
const Web3 = require('web3')
const net = require('net');

NativeCurrencyOracleContract = require('../client/src/contracts/CurrencyOracleContract.json');

const nativePrivateKey1 = process.env.NATIVE_PK1;
const nativePrivateKey2 = process.env.NATIVE_PK2;

const gasLimit = process.env.GAS_LIMIT;
let gasPrice = process.env.GAS_PRICE;
const nativeProvider = process.env.NATIVE_PROVIDER;

console.log(nativeProvider)

const nativeWeb3 = new Web3(nativeProvider, net)

nativeWeb3.prefix = "Native";

const ratesUrl = 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=BTC,USD,LTC'
const chgMarketUrl = 'http://127.0.0.1:3703/api/getBestSellOrder?amountCHG=10';

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const rates = {
  ETH: 0,
  BTC: 0,
  LTC: 0,
  USD: 0
}

const currencyIds = {
  ETH: 1,
  BTC: 2,
  LTC: 3,
  USD: 4
}


const signer = nativeWeb3.eth.accounts.privateKeyToAccount(nativePrivateKey1);


const main = async  () => {

  

  const balance = await nativeWeb3.eth.getBalance(signer.address);
  console.log("Signer",signer.address,"balance",nativeWeb3.utils.fromWei(balance, "ether"), "CHARG");

  // Get the contract instance.
  const nativeNetworkId = await nativeWeb3.eth.net.getId();
  const nativeCurrencyOracleDeployed = NativeCurrencyOracleContract.networks[nativeNetworkId];
  const nativeCurrencyOracleInstance = new nativeWeb3.eth.Contract(
    NativeCurrencyOracleContract.abi,
    nativeCurrencyOracleDeployed && nativeCurrencyOracleDeployed.address,
  );
  nativeWeb3.oracleInstance = nativeCurrencyOracleInstance;
  const owner = await nativeWeb3.oracleInstance.methods.owner().call();
  console.log("Owner",owner);

  if (owner != signer.address) {
    try {
      await nativeWeb3.oracleInstance.methods.transferOwnership(signer.address).send({
        gas: gasLimit, 
        gasPrice: gasPrice,
        from: owner
      }, (error, result) => {
        if (error) {
          console.error( 'sign error', error);
        } else {
          console.log(result)
        }
      })
    }catch (e) {
      console.log(e);
    }
  }

  const getGasPrice = async (web3) => {
    let gasPrice = web3.gasPrice; // from .env
    
    //gasPrice = await web3.eth.getGasPrice();

    try {
      const resp = await request('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=S7C6S5JMM5G1EZ3P2S25DEKFHPK34TPFDA');
      const data = JSON.parse(resp);
      const newGasPrice = Number(data.result.SafeGasPrice);
      /*
      const resp = await request('https://ethgasstation.info/api/ethgasAPI.json');
      const data = JSON.parse(resp);
      const newGasPrice = Number(data.average)/10;
      */
      if (newGasPrice>0) {
        gasPrice = newGasPrice*10**9
      } 
    } catch (e) {
      console.log(e);
    }
    
    return gasPrice;
  }

  const sendToNet = (currency, rate) => {

    //const signer = nativeWeb3.eth.accounts.privateKeyToAccount(nativePrivateKey1);

    if (rates[currency] != rate) {
      rates[currency] != rate;
      console.log(signer.address);
      nativeWeb3.oracleInstance.methods.setRate(currencyIds[currency], rates[currency]*10**18).send({
        gas: gasLimit, 
        gasPrice: gasPrice,
        from: signer.address
      }, (error, result) => {
        if (error) {
          console.error( 'sign error', error);
        } else {
          console.log(currency, rate,"rate sent")
        }
      })
    }

  }

  const getRates = async () => {

    try {
      const resp = await request(ratesUrl);

      console.log(resp);

      const result = JSON.parse(resp);
      sendToNet('BTC', rates.ETH * result.BTC)
      sendToNet('LTC', rates.ETH * result.LTC)
      sendToNet('USD', rates.ETH * result.USD)
    } catch (e) {
      console.error(e)
    }
  };
  
  const getChgEthRate = async () => {

    try {
      //const resp = await request(chgMarketUrl);
      const resp = await request({
        method: 'GET',
        //json: true,
        uri : chgMarketUrl,
        //insecure: true
      });
      console.log(resp);
      const result = JSON.parse(resp);
      sendToNet('ETH', result.bestSellOrder.rate)
    } catch (e) {
      console.error(e)
    }

  };

  //getGasPrice();

  getChgEthRate();
	setInterval(getRates, 120000);
	setInterval(getChgEthRate, 60000);

}
console.log('\n\n\nStarted', Date().toString())
main();
