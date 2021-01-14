import React from "react";

import {Header} from "./Header";
import {Footer} from "./Footer";

export const Setup = () => (
    <React.Fragment>
        <Header title='Charg Coin' />
        <div>
            <h3>Setup</h3>
        </div>
        <Footer ethNetwork={'ethNetwork'} ethAccount={'ethAccount'} balances={{}}/>
    </React.Fragment>
);
