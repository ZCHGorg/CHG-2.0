import React, {useState} from "react";
import AppContext from "../context/AppContext";
import {Modal, Button} from "react-bootstrap";
import {InputSpinner} from "../components/InputSpinner"
import {AlertBlock} from "../components/AlertBlock"

export const SellModal = (props) => {

    const [value, setValue] = useState(props.value);
    const [warning, setWarning] = useState('');
    const [context] = React.useContext(AppContext);
    const handleClose = () => props.setShow(false);

    return (
      <>
        <Modal show={props.show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> Sell CHG Coins </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <center>
                <label>You can sell {Number(props.order.amount).toFixed(1)} CHG @ {Number(props.order.rate).toFixed(5)} CHG/ETH </label><br/>
                <small className="text-muted">{props.order.hash} from {props.order.seller} expire on {props.order.expire}</small><br/>
                <label>Enter the amount in CHG coins you want to sell</label>
                <InputSpinner 
                  max = {Math.min(context ? context.balances.chgMarket : 0, props.order.amount)} 
                  value = {Math.round(Math.min(value, context ? context.balances.chgMarket : 0, props.order.amount))}
                  min={0} step={10} digits={1} onChange={setValue}
                />
                <h5>
                  You will receive : <b style={{padding:'5px'}}>{(value * props.order.rate).toFixed(4)}</b> ETH
                </h5>
            </center>
            <AlertBlock message={warning} setMessage={setWarning} variant="warning" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={handleClose}>
                Close
            </Button>
            <Button variant="outline-primary" 
                onClick={()=>{
                  if (context.defaultAccount===props.order.seller) {
                    props.handleCancelBuyOrder(props.order);
                    handleClose();
                  } else if (value > 0) {
                    props.handleSell(props.order, value);
                    handleClose();
                  }else{
                    setWarning('Wrong value');
                  }
                }}
            >
              { context.defaultAccount===props.order.seller ? 'Cancel Order' : 'Sell CHG' }
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
}
