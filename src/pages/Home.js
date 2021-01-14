import React from "react";
import GoogleMapReact from 'google-map-react';
import AppContext from "../context/AppContext";
import {Header} from "./Header";
import {Footer} from "./Footer";

//import {GoogleMap} from "../components/GoogleMap"

// consts: [34.0522, -118.2437]
//import LOS_ANGELES_CENTER from '../const/la_center';
const LOS_ANGELES_CENTER = [34.0522, -118.2437];

// InfoWindow component
const InfoWindow = (props) => {
  const { place } = props;
  const infoWindowStyle = {
    position: 'relative',
    borderRadius: '10%',
    border: '2px solid #c8d9ea',
    bottom: 90,
    left: '-45px',
    width: 150,
    backgroundColor: '#212c38',
    boxShadow: '0 2px 7px 1px rgba(0, 255, 255, 0.3)',
    padding: 1,
    fontSize: 14,
    zIndex: 100,
  };

  /* // feedback
    <div style={{ fontSize: 14 }}>
    <span style={{ color: 'grey' }}>
        {4.5}{' '}
    </span>
    <span style={{ color: 'orange' }}>
        {String.fromCharCode(9733).repeat(Math.floor(4))}
    </span>
    <span style={{ color: 'lightgrey' }}>
        {String.fromCharCode(9733).repeat(5 - Math.floor(4))}
    </span>
    </div>
  */

  return (
    <div style={infoWindowStyle}>
      <div style={{ fontSize: 16 }}>
        <a href={'/service/'+place.nodeAddress}>{place.name}</a>
      </div>
      <div style={{ fontSize: 14, color: 'light-orange' }}>
        {place.connector} - {place.power}
      </div>
      <div style={{ fontSize: 14, color: '#c8d9ea' }}>
        {place.phone}
      </div>
      <div style={{ fontSize: 14, color: '#c8d9ea' }}>
        {place.connected ? (<a href='#'>click to visit</a>) : 'not connected'}
      </div>
    </div>
  );
};

// Marker component
const Marker = (props) => {
  const markerStyle = {
    border: '3px solid yellow',
    borderRadius: '30%',
    height: 30,
    width: 30,
    backgroundColor: '#212c38',
    //backgroundColor: props.show ? 'red' : 'blue',
    cursor: 'pointer',
    zIndex: 10,
  };
  return (
    <>
      <div style={markerStyle}> 
        <img style={{width:'100%'}} src='/images/logo.png' alt='CHG'/>
      </div>
      {props.show && <InfoWindow place={props.place} />}
    </>
  );
};

export const Home = props => {

    const [registeredNodes, setRegisteredNodes] = React.useState([]);
    const [geoLocation, setGeoLocation] = React.useState(null);
    const [mapCenter, setMapCenter] = React.useState(geoLocation);
    const [mapZoom, setMapZoom] = React.useState(5);
    const [context] = React.useContext(AppContext);

    const updateNodes = () => {
        if (context && context.dapp) {
            if (registeredNodes.length===0) {
                setRegisteredNodes(Object.entries(context.dapp.registeredNodes).map( ([n, p], i) => ({...p, nodeAddress: n, id:i, show:false})));
            }
        }
    }

    React.useEffect(() => {
        updateNodes();
    }, [context]);

    React.useEffect(() => {
        if (typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined") {
            navigator.geolocation.getCurrentPosition( loc=> {
                const curlocation = [loc.coords.latitude, loc.coords.longitude];
                setGeoLocation(curlocation);
                console.log(curlocation)
                setMapCenter(curlocation)
                setMapZoom(8)
            }, error => {
                if (error.code == 1) {
                    console.error("Error: PERMISSION_DENIED: User denied access to their location");
                } else if (error.code === 2) {
                    console.error("Error: POSITION_UNAVAILABLE: Network is down or positioning satellites cannot be reached");
                } else if (error.code === 3) {
                    console.error("Error: TIMEOUT: Calculating the user's location too took long");
                } else {
                    console.error("Unexpected error code")
                }
            })
        } else {
            console.log("Your browser does not support the HTML5 Geolocation API, so this demo will not work.")
        }
    }, []);


    if (context && context.dapp) {
        context.dapp.on('registeredNodes', updateNodes);
    }

    // onChildClick callback can take two arguments: key and childProps
    const onChildClickCallback = (key, childProps, onTableClick=false) => {

        const index = registeredNodes.findIndex(e => e.id == key);
        const newNodesState = [...registeredNodes];
        //console.log(index, key, childProps);
        if (onTableClick) {
            setMapCenter([newNodesState[index].latitude, newNodesState[index].longitude]);
            newNodesState[index].show = true; // eslint-disable-line no-param-reassign
        } else {
            newNodesState[index].show = !newNodesState[index].show; // eslint-disable-line no-param-reassign
        }
        setRegisteredNodes(newNodesState);
    };


    return (
    <>
        <Header title='Energy is Money' />
        <main role="main" className="inner cover">
            <br/>
            <p className="lead">Using the power of the blockchain, <a target="_blank" rel="noopener noreferrer" href="https://chgcoin.org/"><b>Charg Coin (CHG)</b></a> facilitates crowdsourced energy distribution.</p>

            <br/>
            <p> 
                This decentralized application will help you to start any service provided by powerful <a target="_blank" rel="noopener noreferrer" href="https://chgcoin.org/"><b>CHG Network</b></a>.
                You can use it with any legacy DApp browser, like <a target="_blank" rel="noopener noreferrer" href="https://wallet.coinbase.com/"><b>Coinbase Wallet</b></a> or <a target="_blank" rel="noopener noreferrer" href="https://www.myetherwallet.com/"><b>MyEtherWallet</b></a> 
                as well as with browser extentions like <a target="_blank" rel="noopener noreferrer" href="https://metamask.io"><b>Metamask</b></a> or <a target="_blank" rel="noopener noreferrer" href="https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid"><b>Nifty Wallet</b></a>. 
                Also you can work with DApp on your desktop or mobile browser, in that case <a target="_blank" rel="noopener noreferrer" href="https://github.com/ConsenSys/eth-lightwallet/"><b>Lightweight JS Wallet </b></a> will be used
            </p>
            <div id="mobile"></div>

            <div className="card mb-12 shadow-sm charg-block">
                <div className="card-body">
                    <GoogleMapReact 
                        zoom={mapZoom}
                        options={map => ({ mapTypeId: map.MapTypeId.HYBRID })}
                        defaultCenter2={LOS_ANGELES_CENTER}
                        center={mapCenter}
                        bootstrapURLKeys={{ key: process.env.REACT_APP_MAP_KEY }}
                        onChildClick={onChildClickCallback}
                        style={{height:'400px'}}                    >
                        {registeredNodes.map(station => (
                            <Marker
                                key={station.id}
                                id={station.id}
                                nodeAddress={station.nodeAddress}
                                lat={station.latitude}
                                lng={station.longitude}
                                show={station.show}
                                place={station}
                            />
                        ))}
                    </GoogleMapReact>
                </div>
            </div>

            <div className="card mb-12 shadow-sm charg-block">
                <div className="card-body">
                    <div className="row">
                        <div className="col">
                            <div className="tableFixHead">
                            <table className="table table-hover table-dark">
                                <thead>
                                    <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Location</th>
                                    <th scope="col">Phone</th>
                                    <th scope="col">Connector</th>
                                    <th scope="col">Power</th>
                                    </tr>
                                </thead>
                                <tbody id="nodes-list-table">
                                    {registeredNodes.map(station => (
                                        <tr key={station.id} onClick={()=>onChildClickCallback(station.id, station, true)}>
                                        <td>{station.name}</td>
                                        <td>{station.location}</td>
                                        <td>{station.phone}</td>
                                        <td>{station.connector}</td>
                                        <td>{station.power}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>                                                                    
                            </div>                            
                            <a href='/register'><button type="button" className="btn btn-lg btn-block btn-outline-primary">Register your node</button></a>
                        </div>                            
                    </div>
                </div>
            </div>
        </main>
        <Footer/>
    </>
    )
};
