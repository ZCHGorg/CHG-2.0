import React, {useState} from "react";
import {Modal, Button, Form} from "react-bootstrap";
import {AlertBlock} from "../components/AlertBlock"

export const LoadWalletModal = (props) => {

    const [show, setShow] = useState(false);
    const [warning, setWarning] = useState('');
  
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
      <>
        <Button onClick={handleShow} size="md" variant="outline-primary">
            Load your Wallet
        </Button>

        <Form>
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> Load your Lihgt Wallet Account </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
                <Form.Group controlId="exampleForm.ControlTextarea1">
                  <Form.Label>Enter secret seed phrase</Form.Label>
                  <Form.Control as="textarea" rows="2"
                    value={props.walletSeed} 
                    onChange={(e)=>props.setWalletSeed(e.target.value)}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label style={{padding: '10px'}}>Enter password of your wallet</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Password of your wallet" 
                    value={props.walletPassword} 
                    onChange={(e)=>props.setWalletPassword(e.target.value)}
                  />
                </Form.Group>
                <AlertBlock message={warning} setMessage={setWarning} variant="warning" />
            </>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={handleClose}>
                Close
            </Button>
            <Button variant="outline-primary" 
                onClick={()=>{
                  props.handleLoadWallet();
                  handleClose();
                }}
            >
                Open Wallet
            </Button>
          </Modal.Footer>
        </Modal>
        </Form>
      </>
    );
}
