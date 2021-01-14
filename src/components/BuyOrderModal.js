import React, {useState, useEffect} from "react";
import {Modal, Button} from "react-bootstrap";
import AppContext from "../context/AppContext";
import {InputSpinner} from "../components/InputSpinner"
import {AlertBlock} from "../components/AlertBlock"

export const BuyOrderModal = (props) => {

  const defaultExchangeBid = 0.00015;
  const [context] = React.useContext(AppContext);
  const [amountGive, setAmountGive] = useState(0);
  const [amountGet, setAmountGet] = useState(0);
  const [rate, setRate] = useState(defaultExchangeBid);// todo: replace with default rate exchane
  const [expire, setExpire] = useState(100000);
  const [warning, setWarning] = useState('');
  const handleClose = () => props.setShow(false);

  const rateChanged = (newRate) => {
    setRate(newRate);
    setAmountGive(newRate > 0 ? amountGet * newRate : 0);
  }

  useEffect(() => {
    if ( context && context.dapp && context.dapp.exchangeBid && rate===defaultExchangeBid ) {
      rateChanged(context.dapp.exchangeBid)
    }
  },[context, rate]);

  const amountGetChanged = (newGetVal) => {
    setAmountGet(newGetVal);
    setAmountGive(rate > 0 ? newGetVal * rate : 0);
  }

  const amountGiveChanged = (newGiveVal) => {
    setAmountGive(newGiveVal);
    setRate(amountGet>0 ? newGiveVal/amountGet : 0);
  }
  
  return (
    <>
        <Modal show={props.show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> Add new CHG Buy Order </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
              <label>Enter the amount of CHG you wish to buy</label><br/>
              <InputSpinner 
                max = {context ? context.balances.ethMarket / rate : 0} 
                value = {amountGet} min={0} step={10} digits={1} onChange={amountGetChanged}
              />
              <label>Enter the amount of ETG you will pay</label><br/>
              <InputSpinner 
                max = {context ? context.balances.ethMarket : 0} 
                value = {amountGive} min={0} step={0.001} digits={5} onChange={amountGiveChanged}
              />
              <label>Enter CHG / ETG rate {context.dapp ? '(curent market '+Number(context.dapp.exchangeBid).toFixed(5)+')' : ''}</label><br/>
              <InputSpinner 
                max = {context.dapp ? Number(context.dapp.exchangeAsk).toFixed(5) : 0.00001} min={0.00001}
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
              Place Buy Order
            </Button>
          </Modal.Footer>
        </Modal>
    </>
  );
}
