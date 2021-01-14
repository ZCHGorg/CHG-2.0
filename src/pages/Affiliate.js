import React from "react";

import {Header} from "./Header";
import {Footer} from "./Footer";

export const Affiliate = () => (
    <React.Fragment>
        <Header title='Affiliate Program' />
        <div>
            <iframe 
                src="https://wecharg.com/affiliate-login-page/" 
                frameBorder="0" allowFullScreen
                style={{position:'absolute', top:'120px', left:0, width:'100%', height:'100%'}}>
            </iframe>
        </div>
    </React.Fragment>
);
