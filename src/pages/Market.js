import React, {useContext, useState} from "react";
import AppContext from "../context/AppContext";

import {Header} from "./Header";
import {Footer} from "./Footer";

import {CreateWalletModal} from "../components/CreateWalletModal"
import {LoadWalletModal} from "../components/LoadWalletModal"

import {Button} from "react-bootstrap";
import {MarketOrders} from "../components/MarketOrders"
import {TransferModal} from "../components/TransferModal"
import {AlertBlock} from "../components/AlertBlock"

//import $ from "jquery";
//import jQuery from "jquery";
//window.$ = window.jQuery = require('jquery');
//import "bootstrap-input-spinner";
//import useScript from '../hooks/useScript';

//const MyComponent = props => {
//  useScript('https://use.typekit.net/foobar.js');
//  // rest of your component
//}

export const Market = props => {

    const [context] = useContext(AppContext);
    const [message, setMessage] = useState('');
    const [warning, setWarning] = useState('');

    const [walletPassword, setWalletPassword] = React.useState('');
    const [walletSeed, setWalletSeed] = React.useState('');

    const signResult = (error, result) => {
        console.log(error, result);
        if (error===null) {
            setMessage(<>
                The transaction is 
                <b><a 
                    target='_blank' rel='noopener noreferrer'
                    style={{color:'#1b4777'}}
                    href={context.config.scanUrl+'/tx/'+result} 
                > signed and sent </a></b></>
            );
        } else {
            setWarning(<>
                'The transaction was not signed !'<br/>
            </>);
        }
    }
    
    const handleUnlock = () => {
        context.dapp.increaseApproval(10**32, signResult);
    }

    const handleCreateWallet = () => {
        if (context.dapp) {
            context.dapp.createLightWalletAccount(walletPassword);
        }
    }

    const handleLoadWallet = () => {
        if (context.dapp) {
            context.dapp.loadLightWalletAccount(walletPassword, walletSeed);
        }
    }

    const doTransfer = (action, currency, value) => {
        
        if (value <= 0) {
            setWarning('Wrong amount value provided !');
            return;
        }
        
        if (!context.defaultAccount || context.defaultAccount.length < 20) {
            setWarning('Your digital wallet is not connected  !');
            return;
        }

        const valueWei = 10**18 * value;
        switch(action.toLowerCase()) {
            case 'deposit':
                switch(currency.toUpperCase()) {
                    case 'CHG':
                        context.dapp.depositCoins(valueWei, signResult);
                        break;
                    case 'ETH':
                        context.dapp.depositEther(valueWei, signResult);
                        break;
                    default:
                }
                break;
            case 'withdraw':
                switch(currency.toUpperCase()) {
                    case 'CHG':
                        context.dapp.withdrawCoins(valueWei, signResult);
                        break;
                    case 'ETH':
                        context.dapp.withdrawEther(valueWei, signResult);
                        break;
                    default:
                }
                break;
            default:
        }
    }

    if (!context.defaultAccount || context.defaultAccount.length < 20) {
        return (
        <React.Fragment>
            <Header title='Charg Coin Market' />
            <main role="main" className="inner cover">
                <br/>
                <p className="lead">Using the power of the blockchain, <a target="_blank"  rel="noopener noreferrer" href="https://chgcoin.org/"><b>Charg Coin (CHG)</b></a> facilitates crowdsourced energy distribution.</p>
                <div id="mobile"></div>
                <p> 
                This decentralized application will help you to start any service provided by powerful <a target="_blank" rel="noopener noreferrer" href="https://chgcoin.org/"><b>CHG Network</b></a>.<br/>
                You can use it with any legacy DApp browser, like <a target="_blank" rel="noopener noreferrer" href="https://wallet.coinbase.com/"><b>Coinbase Wallet</b></a> or <a target="_blank" rel="noopener noreferrer" href="https://www.myetherwallet.com/"><b>MyEtherWallet</b></a> 
                as well as with browser extentions like <a target="_blank" rel="noopener noreferrer" href="https://metamask.io"><b>Metamask</b></a> or <a target="_blank" rel="noopener noreferrer" href="https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid"><b>Nifty Wallet</b></a>. <br/>
                Also you can work with DApp on your desktop or mobile browser, in that case <a target="_blank" rel="noopener noreferrer" href="https://github.com/ConsenSys/eth-lightwallet/"><b>Lightweight JS Wallet </b></a> will be used
                </p>

                <center>
                <p>If you want to sell or buy CHG Coins you need to connect to you blockchain wallet.</p>
                <LoadWalletModal
                    walletPassword = {walletPassword}
                    setWalletPassword = {setWalletPassword}
                    walletSeed = {walletSeed}
                    setWalletSeed = {setWalletSeed}
                    handleLoadWallet = {handleLoadWallet}
                />
                or
                <br/>
                <CreateWalletModal
                    walletPassword = {walletPassword}
                    setWalletPassword = {setWalletPassword}
                    handleCreateWallet = {handleCreateWallet}
                    lwSeed = {context.lwSeed}
                />
                <br/>
                </center>

            </main>

            <MarketOrders context={context} signResult={signResult}/>

            <Footer/>
        </React.Fragment>
        )
    }else{
        return (
        <React.Fragment>
            <Header title='Charg Coin Market' />
            <main role="main" className="inner cover">
                <br/>
                <p className="lead">Using the power of the blockchain, <a target="_blank"  rel="noopener noreferrer" href="https://chgcoin.org/"><b>Charg Coin (CHG)</b></a> facilitates crowdsourced energy distribution.</p>
                <div id="mobile"></div>

                <div className="card-deck mb-3 text-center">

                    <div className="card mb-6 shadow-sm">
                        <div className="card-header">
                            <h4 className="my-0 font-weight-normal">CHG Balance</h4>
                        </div>
                        <div className="card-body">

                            <h3 className="card-title pricing-card-title">
                                <div className="row">
                                    <div className="col">
                                        <span>Wallet: </span>
                                    </div>
                                    <div className="col">
                                        <span id="chg-wallet-balance">{context.balances.chg}</span>
                                        <small className="text-muted">CHG</small>
                                    </div>
                                </div>
                            </h3>
                            <h3 className="card-title pricing-card-title">
                                <div className="row">
                                    <div className="col">
                                        <span>Market: </span>
                                    </div>
                                    <div className="col">
                                        <span id="chg-market-balance">{context.balances.chgMarket}</span>
                                        <small className="text-muted">CHG</small>
                                    </div>
                                </div>
                            </h3>

                            <div className="row">
                                <div className="col">
                                    { (!context.balances.allowance || context.balances.allowance.lt(10**6)) ? (
                                        <Button onClick={handleUnlock} size="lg" variant="outline-primary" block>
                                            Unlock
                                        </Button>
                                    ):(
                                        <TransferModal 
                                            action="Deposit" currency="CHG" handleAction={doTransfer}
                                            description="Enter the amount of CHG you wish to deposit for trading on the Charg Market"
                                            min={0} max={context.balances.chg} step={10} digits={0} value={10*Math.round(context.balances.chg/20)} 
                                        />
                                    )}
                                </div>                            
                                <div className="col">
                                    <TransferModal 
                                        action="Withdraw" currency="CHG" handleAction={doTransfer}
                                        description="Enter the amount of CHG you wish to withdraw from the Charg Market"
                                        min={0} max={context.balances.chgMarket} step={10} digits={0} value={10*Math.round(context.balances.chgMarket/20)} 
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="card mb-6 shadow-sm ">
                        <div className="card-header">
                            <h4 className="my-0 font-weight-normal">ETH Balance</h4>
                        </div>
                        <div className="card-body">

                            <h3 className="card-title pricing-card-title">
                                <div className="row">
                                    <div className="col">
                                        <span>Wallet: </span>
                                    </div>
                                    <div className="col">
                                        <span id="eth-wallet-balance">{context.balances.eth}</span>
                                        <small className="text-muted">ETH</small>
                                    </div>
                                </div>
                            </h3>
                            <h3 className="card-title pricing-card-title">
                                <div className="row">
                                    <div className="col">
                                        <span>Market: </span>
                                    </div>
                                    <div className="col">
                                        <span id="eth-market-balance">{context.balances.ethMarket}</span>
                                        <small className="text-muted">ETH</small>
                                    </div>
                                </div>
                            </h3>

                            <div className="row">
                                <div className="col">
                                    <TransferModal 
                                        action="Deposit" currency="ETH" handleAction={doTransfer}
                                        description="Enter the amount of ETH you wish to deposit for trading on the Charg Market" 
                                        min={0.0} max={context.balances.eth} step={0.01} digits={3} value={Math.round(context.balances.eth*10)/20} 
                                    />
                                </div>                            
                                <div className="col">
                                    <TransferModal 
                                        action="Withdraw" currency="ETH" handleAction={doTransfer}
                                        description="Enter the amount of ETH you wish to withdraw from the Charg Market" 
                                        min={0.0} max={context.balances.ethMarket} step={0.01} digits={3} value={Math.round(context.balances.ethMarket*10)/20} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <MarketOrders context={context} signResult={signResult}/>
                <AlertBlock message={message} setMessage={setMessage} variant="dark" />
                <AlertBlock message={warning} setMessage={setWarning} variant="warning" />

            </main>
            <Footer/>
        </React.Fragment>
        )
    }
};
