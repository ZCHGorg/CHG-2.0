import React, {useState} from "react";
import {Modal, Button} from "react-bootstrap";
import {InputSpinner} from "../components/InputSpinner"
import {AlertBlock} from "../components/AlertBlock"

export const TransferModal = (props) => {

    const [show, setShow] = useState(false);
    const [value, setValue] = useState(props.value);
    const [warning, setWarning] = useState('');
  
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
  
    return (
      <>
        <Button onClick={handleShow} size="lg" block variant="outline-primary">
            {props.action}
        </Button>
  
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title> {props.action} {props.currency} </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <>
                <label style={{padding: '10px'}}>{props.description}</label>
                <InputSpinner min={props.min} max={props.max} step={props.step} digits={props.digits} value={value} onChange={setValue}/>
            </>
            <AlertBlock message={warning} setMessage={setWarning} variant="warning" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={handleClose}>
                Close
            </Button>
            <Button variant="outline-primary" 
                onClick={()=>{
                  if (value > 0) {
                    props.handleAction(props.action, props.currency, value);
                    handleClose();
                  }else{
                    setWarning('Wrong value');
                  }
                }}
            >
                {props.action}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
}
