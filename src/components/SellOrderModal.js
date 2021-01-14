import React, {useState, useEffect} from "react";
import {Modal, Button} from "react-bootstrap";
import AppContext from "../context/AppContext";
import {InputSpinner} from "../components/InputSpinner"
import {AlertBlock} from "../components/AlertBlock"

export const SellOrderModal = (props) => {

  const defaultExchangeAsk = 0.0035;
  const [context] = React.useContext(AppContext);
  const [amountGive, setAmountGive] = useState(0);
  const [amountGet, setAmountGet] = useState(0);
  const [rate, setRate] = useState(defaultExchangeAsk);
  const [expire, setExpire] = useState(100000);
  const [warning, setWarning] = useState('');
  const handleClose = () => props.setShow(false);

  const rateChanged = (newRate) => {
    setRate(newRate);
    setAmountGet(amountGive * newRate);
  }

  useEffect(() => {
    if ( context && context.dapp && context.dapp.exchangeBid && rate===defaultExchangeAsk ) {
      rateChanged(context.dapp.exchangeAsk)
    }
  },[context, rate]);

  const amountGetChanged = (newGetVal) => {
    setAmountGet(newGetVal);
    setRate(amountGive>0 ? newGetVal/amountGive : 0);
  }

  const amountGiveChanged = (newGiveVal) => {
    setAmountGive(newGiveVal);
    setAmountGet(newGiveVal * rate);
  }
  
  return (
    <>
        <Modal show={props.show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> Add new CHG Sell Order </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
              <label>Enter the amount of CHG you wish to sell</label><br/>
              <InputSpinner 
                max = {Math.round(context ? context.balances.chgMarket : 0)} 
                value = {amountGive} min={0} step={10} digits={1} onChange={amountGiveChanged}
              />
              <label>Enter the amount of ETG you wish to get</label><br/>
              <InputSpinner 
                max = {context ? context.balances.chgMarket*(context.dapp ? Number(context.dapp.exchangeBid) : rate) : 0} 
                value = {amountGet} min={0} step={0.001} digits={5} onChange={amountGetChanged}
              />
              <label>Enter CHG / ETG rate {context.dapp ? '(curent market '+Number(context.dapp.exchangeAsk).toFixed(5)+')' : ''}</label><br/>
              <InputSpinner 
                max = {10} min={context.dapp ? Number(context.dapp.exchangeBid).toFixed(5) : 0.00001}
                value = {rate} step={0.00001} digits={7} onChange={rateChanged}
              />
              <label>Will expire in {expire} blocks (about {Math.round(expire*15/(24*3600))} days)</label><br/>
              <InputSpinner 
                max = {9000000} 
                value = {expire} min={10000} step={10000} digits={0} onChange={setExpire}
              />
            </>
            <AlertBlock message={warning} setMessage={setWarning} variant="warning" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={handleClose}>
                Close
            </Button>
            <Button variant="outline-primary" 
                onClick={()=>{
                  if (amountGive > 0 && amountGet > 0 && expire > 0) {
                    props.handleAction(amountGive, amountGet, expire);
                    handleClose();
                  }else{
                    setWarning('Wrong value');
                  }
                }}
            >
              Place Sell Order
            </Button>
          </Modal.Footer>
        </Modal>
    </>
  );
}
