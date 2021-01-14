const fs = require('fs');
require('dotenv').config();
if (process.env.DOTENV_PATH) {
	require('dotenv').config({ path: process.env.DOTENV_PATH });
} else {
	require('dotenv').config({ path: __dirname+'/.env' });
}

const normalizePort = (val) => {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

const config = 
{
	hub: {
		enabled: true
	},
	debug: process.env.DEBUG,
	runDApp: process.env.RUN_DAPP,
	server:{
		protocol: process.env.HTTP_PROTOCOL || 'https',
		path: process.env.DAPP_PATH || __dirname+'/../charg-dapp/dist',
		port: normalizePort(process.env.HTTP_PORT || '443'),
		apiPort: normalizePort(process.env.API_PORT || '3703'),
		wsPort: normalizePort(process.env.WS_PORT || '3701'),
	},
	sslOptions: {
		key: fs.readFileSync(process.env.SSL_KEY || __dirname+'/../ssl/localhost.key'),
		cert: fs.readFileSync(process.env.SSL_CERT || __dirname+'/../ssl/localhost.crt'),
		//key: fs.readFileSync(process.env.SSL_KEY || __dirname+'/../ssl/privkey.pem'),
		//cert: fs.readFileSync(process.env.SSL_CERT || __dirname+'/../ssl/cert.pem'),
		ca: fs.readFileSync(process.env.SSL_CA || __dirname+'/../ssl/chain.pem')
	},
	reserveAccount: {
		addr: process.env.RESERVE_ADDR,
		pk: process.env.RESERVE_PK
	},
	bitcoinOptions: {
		host: process.env.BTC_HOST,
		network: process.env.BTC_NETWORK,
		port: process.env.BTC_PORT,
		username: process.env.BTC_USERNAME,
		password: process.env.BTC_PASSWORD,
		explorer: process.env.BTC_EXPLORER
	},
	litecoinOptions: {
		host: process.env.LTC_HOST,
		network: process.env.LTC_NETWORK,
		port: process.env.LTC_PORT,
		username: process.env.LTC_USERNAME,
		password: process.env.LTC_PASSWORD,
		explorer: process.env.LTC_EXPLORER,
	},
	braintreeOptions: {
		environment: process.env.BT_ENVIRONMENT.charAt(0).toUpperCase() + process.env.BT_ENVIRONMENT.slice(1),
		merchantId: process.env.BT_MERCHANT_ID,
		publicKey: process.env.BT_PUBLIC_KEY,
		privateKey: process.env.BT_PRIVATE_KEY
	},

	gasLimit: process.env.GAS_LIMIT,
	gasPrice: process.env.GAS_PRICE,
	chargeContractAddress: process.env.CHARG_CONTRACT,
	serviceContractAddress: process.env.SERVICE_CONTRACT,
	forkdeltaContractAddress: process.env.FD_CONTRACT,

	events: {
		sellOrder: process.env.SELL_ORDER_EVENT,
		buyOrder: process.env.BUY_ORDER_EVENT,
		sell: process.env.SELL_EVENT,
		buy: process.env.BUY_EVENT,
		cancelSell: process.env.CANCEL_SELL_EVENT,
		cancelBuy: process.env.CANCEL_BUY_EVENT,
		serviceOn: process.env.SERVICE_ON_EVENT,
		serviceOff: process.env.SERVICE_OFF_EVENT,
		nodeRegistered: process.env.NODE_REGISTERED,
		nodeModified: process.env.NODE_MODIFIED,
	},
	
	ratesUrl: process.env.RATES_URL,
	updateRatesInterval: 180000,
	scanUrl: process.env.SCAN_URL,
	web3Network: process.env.WEB3_NETWORK,
	web3WsProvider: process.env.WEB3_WS_PROVIDER || 'wss://rinkeby.infura.io/ws',
	web3HttpProvider: process.env.WEB3_HTTP_PROVIDER || 'https://rinkeby.infura.io/',
	nativeWeb3HttpProvider: process.env.NATIVE_WEB3_HTTP_PROVIDER || 'http://127.0.0.1:8545/',
	geoLocationUrl: process.env.GEO_LOCATION_URL,
	googleMapsKey: process.env.GOOGLE_MAPS_KEY,
	socketDeltaUrl: process.env.FD_WS_URL,
    firebaseConfig: {		
        apiKey: process.env.FB_APIKEY,
        authDomain: process.env.FB_AUTHDOMAIN,
        databaseURL: process.env.FB_DATABASE_URL,
        projectId: process.env.FB_PROJECT_ID,
        storageBucket: process.env.FB_STORAGE_BUCKET,
        messagingSenderId: process.env.FB_SENDER_ID
    }
}

module.exports = config;
