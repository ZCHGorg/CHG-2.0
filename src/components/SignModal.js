import React, {useState} from "react";
import {Modal, Button, Form} from "react-bootstrap";
import {AlertBlock} from "../components/AlertBlock"

export const SignModal = (props) => {

    //const [show, setShow] = useState(props.show);
    const [warning, setWarning] = useState('');
  
    const handleClose = () => props.setShow(false);
    //const handleShow = () => setShow(true);

    return (
      <>
        <Form>
        <Modal show={props.show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> Sign with Lihgt Wallet Account </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
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
                      props.handleSign();
                      handleClose();
                }}
            >
                Sign
            </Button>
          </Modal.Footer>
        </Modal>
        </Form>
      </>
    );
}
