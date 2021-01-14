import React from "react";
import {Alert} from "react-bootstrap";

export const AlertBlock = props => {
    
    //const [message, setMessage] = useState(props.message);

    //console.log('start AlertBlock', message)

    /*
    React.useEffect(() => {
        //console.log('AlertBlock rendered', message)
        return () => {
            console.log('AlertBlock destroyed');
        }
    });
    */
    
    if (props.message !== '') {
        return (
        <Alert variant={props.variant} onClose={() => props.setMessage('')} dismissible>
          <p>
              {props.message}
          </p>
        </Alert>
      );
    } else {
        return '';
    }
}
  