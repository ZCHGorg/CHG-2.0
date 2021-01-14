import React, {useState} from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";

import {Home} from "./pages/Home";
import {Service} from "./pages/Service";
import {Bridge} from "./pages/Bridge";
import {Market} from "./pages/Market";
import {Setup} from "./pages/Setup";
import {Stats} from "./pages/Stats";
import {Explorer} from "./pages/Explorer";
import {Affiliate} from "./pages/Affiliate";

import AppContext from "./context/AppContext";
import DApp from './modules/DApp';
import config from "./app.config.json";

const App = () => {

  const [context, setContext] = useState({
    account: '',
    balances: {
        charg: 0.0,
        eth: 0.0,
        chg: 0.0,
        ethMarket: 0.0,
        chgMarket: 0.0
  }});

  const dapp = new DApp( config, {
    //nodeAddress: app.nodeAddress,
    //clientMAC: app.clientMAC,
    networkChanged: () => {
      console.log('new net', dapp.networkName)
      setContext(context => ({...context, 
        walletType: dapp.walletType,
        ethNetwork: dapp.networkName
      }))
    }
  });

  /*
  dapp.on('networkChanged', () => {
    console.log('new net', dapp.networkName)
    setContext(context => ({...context, 
      walletType: dapp.walletType,
      ethNetwork: dapp.networkName
    }))
  });
  */

  //const ref = window.document.getElementsByTagName( 'script' )[ 0 ];
  //const script = window.document.createElement( 'script' );
  //script.src = '/lib/qrcode.min.js';
  
  //console.log('start App')


  React.useEffect(() => {


    //console.log(dapp);

    //const valueWei = 10**18;
    //dapp.withdrawEther(valueWei, (error, result) => {
    //  console.log(error, result);
    //});

    setContext(context => ({...context, dapp: dapp, config: config, showSignModal: false}));

    /*    
    dapp.on('newSwapCoin', console.log);
    dapp.on('newService', console.log);
    dapp.on('newNodeService', console.log);
    */
    
    dapp.on('defaultAccount', (account) => {
      const acc = account;
      const net = dapp.networkName;

      console.log(acc, net)
      setContext(context => ({...context, 
        walletType: dapp.walletType,
        defaultAccount: account,
        ethNetwork: dapp.networkName
      }))
    });

    dapp.on('networkChanged', () => {
      console.log('new net 2', dapp.networkName)
      setContext(context => ({...context, 
        walletType: dapp.walletType,
        ethNetwork: dapp.networkName
      }))
    });
  
    dapp.on('allowance', (allowance) => {
      setContext(context => ({...context, 
        balances: {...context.balances,
          allowance: allowance
        }
      }))
    });

    dapp.on('chargBalance', bal => { 
      setContext(context => ({...context, 
        balances: {...context.balances,
          charg: bal.toFixed(config.precision.CHG)
        }
      }))
    });

    dapp.on('ethBalance', bal => { 
      //console.log('ethBalance')
      setContext(context => ({...context, 
        balances: {...context.balances,
          eth: bal.toFixed(config.precision.ETH)
        }
      }))
    });

    dapp.on('chgBalance', bal => { 
      //console.log('chgBalance')
      setContext(context => ({...context, 
        balances: {...context.balances,
          chg: bal.toFixed(config.precision.CHG)
        }
      }))
    });

    dapp.on('ethMarketBalance', bal => { 
      //console.log('ethMarketBalance');
      setContext(context => ({...context, 
        balances: {...context.balances,
          ethMarket: bal.toFixed(config.precision.ETH)
        }
      }))
    });

    dapp.on('chgMarketBalance', bal => { 
      //console.log('chgMarketBalance');
      setContext(context => ({...context, 
        balances: {...context.balances,
          chgMarket: bal.toFixed(config.precision.CHG)
        }
      }))
    });

    dapp.on('lightWallet', (e, seed) => { 
      //console.log('lightWallet', e, seed );
      if (seed) {
        setContext(context => ({...context, 
          lwSeed: seed,
        }))
      }
    });

    return () => {
      console.log('dapp deleted')
      //delete dapp;
    }
    
  },[]); // useEffect 

  return (
    <AppContext.Provider value={[context, setContext]}>
      <Router>
        <Switch>
          <Route exact path="/" component={Home}/>
          <Route exact path="/bridge" component={Bridge}/>
          <Route exact path="/market" component={Market}/>
          <Route exact path="/stats" component={Stats}/>
          <Route exact path="/explorer" component={Explorer}/>
          <Route exact path="/affiliate" component={Affiliate}/>
          <Route exact path="/setup" component={Setup}/>
          <Route exact path="/service/:id" component={Service}/>
          <Redirect from="*" to="/" />
        </Switch>
      </Router>
    </AppContext.Provider>
  )
};

export default App;
