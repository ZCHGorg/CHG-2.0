import React from "react";

import {Header} from "./Header";
import {Footer} from "./Footer";

export const Stats = () => (
    <React.Fragment>
        <Header title='Charg Stats' />
        <div>
            <h3>Charg Stats</h3>
            <iframe 
                src="https://stats.chgcoin.org/" 
                frameBorder="0" allowFullScreen
                style={{position:'absolute', top:'120px', left:0, width:'100%', height:'100%'}}>
            </iframe>
        </div>
    </React.Fragment>
);
