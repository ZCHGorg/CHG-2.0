import React from "react";
import AppContext from "../context/AppContext";
import {CreateWalletModal} from "../components/CreateWalletModal"
import {LoadWalletModal} from "../components/LoadWalletModal"
import {SignModal} from "../components/SignModal"

export const Account = ({context}) => {

    React.useEffect(() => {
        if (context.defaultAccount) {
            if (typeof window.qrcode != 'undefined') {
                const qr = window.qrcode(4, 'L');
                qr.addData(context.defaultAccount);
                qr.make();
                const qrImgTag = qr.createImgTag();
                document.getElementById('qrcode-img').innerHTML = qrImgTag;
            } else {
                document.getElementById('qrcode-img').innerHTML = context.defaultAccount;
            }
        }
    }, [context]);

    if (context.defaultAccount) {
        const href = context.config.scanUrl+'/address/'+ context.defaultAccount;
        return (
            <>
            Your Account: 
            <a target="_blank" rel="noopener noreferrer" href={href}>
                <div id="qrcode-img"></div>
            </a>
            </>
        )
    } else {
        return (
            <>
            </>
        )
    }
}
export const Footer = () => {

    const [context, setContext] = React.useContext(AppContext);
    const [walletPassword, setWalletPassword] = React.useState('');
    const [walletSeed, setWalletSeed] = React.useState('');

    React.useEffect(() => {
        if (context.dapp) {
            context.dapp.options.hookedPasswordProvider = (callback) => {
                window.signCallback = callback;
                setShowSignModal(true);
            }
        }
    });

    const setShowSignModal = (show) => {
        setContext(context => ({...context, showSignModal: show}));
    }

    const handleSign = () => {
        if (context.dapp) {
            try {
                window.signCallback(null, walletPassword);
            } catch (e) {
                console.log(e)
            }
            
        }
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

    return (
        <footer className="mastfoot mt-auto">
            <div className="mx-auto flex-column">

                <div className="row">

                    <div id='node-block' className="col-sm-4">
                        {context.ethNetwork ? (
                            <>
                            You are connected to: <br/>
                            {context.ethNetwork}<br/><br/>
                            </>
                        ):(
                            <>
                            You are not connected to any blockchain<br/>
                            </>
                        )}
                        {context && context.dapp && context.dapp.walletTypes.length > 0 ? (
                        <select defaultValue={context.walletType} onChange={console.log}>
                            {context.dapp.walletTypes.map(type => ( 
                                <option value={type.id} key={type.id}>{type.name}</option>
                            ))}
                        </select>) : null}
                    </div>

                    <div className="col-sm-4">
                        {context.defaultAccount ? (
                            <Account context={context} />
                        ):(
                        <LoadWalletModal
                            walletPassword = {walletPassword}
                            setWalletPassword = {setWalletPassword}
                            walletSeed = {walletSeed}
                            setWalletSeed = {setWalletSeed}
                            handleLoadWallet = {handleLoadWallet}
                        />
                        )}
                    </div>

                    <div id='balances-block' className="col-sm-4">
                        {context.defaultAccount ? (
                                <>
                                Your Balance: <br/>
                                <span id="eth-balance">{(Number(context.balances.eth)+Number(context.balances.ethMarket)).toFixed(3)}</span> ETH <br/>
                                <span id="chg-balance">{(Number(context.balances.chg)+Number(context.balances.chgMarket)).toFixed(0)}</span> CHG ERC <br/>
                                <span id="charg-balance">{(Number(context.balances.charg)).toFixed(0)}</span> CHARG
                                </>
                        ):(
                            <CreateWalletModal
                                walletPassword = {walletPassword}
                                setWalletPassword = {setWalletPassword}
                                handleCreateWallet = {handleCreateWallet}
                                lwSeed = {context.lwSeed}
                            />
                        )}
                    </div>

                </div>
            </div>
            <SignModal
                show = {context.showSignModal}
                setShow = {setShowSignModal}
                walletPassword = {walletPassword}
                setWalletPassword = {setWalletPassword}
                handleSign = {handleSign}
            />

            <div className="inner">
                <p>Powered by the <a href="https://chgcoin.org/">Charg Coin Team</a></p>
            </div>
        </footer>
    );
};        
