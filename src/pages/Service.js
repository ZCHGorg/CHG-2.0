import React from "react";
import {useParams} from "react-router-dom"; 

import {Header} from "./Header";
import {Footer} from "./Footer";

export const Service = (props) => {
    let { id } = useParams();

    console.log('start Service')

    React.useEffect(() => {
        console.log('Service rendered');
        return () => {
            console.log('Service destroyed');
        }
    }, []);

    return (
    <>
        <Header title='Charg Coin Service' />
        <div>
            <h3>Service  {id} </h3>





            
        </div>
        <Footer/>
    </>
)};
