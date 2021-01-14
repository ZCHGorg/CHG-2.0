import React from "react";

import {Header} from "./Header";

export const Explorer = () => (
    <React.Fragment>
        <Header title='Charg Explorer' />
            <iframe 
                src="https://explorer.chgcoin.org/" 
                frameBorder="0" allowFullScreen
                style={{position:'absolute', zIndex:0, top:'100px', left: 0, width:'100%', height:'100%'}}>
            </iframe>

    </React.Fragment>
);
