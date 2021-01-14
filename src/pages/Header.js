import React from "react";
import {NavLink} from "react-router-dom";

export const Header = (props) => {
    return (
        <header className={"masthead mb-auto"}>
            <div className="inner">
                <h3 className="masthead-brand">
                    <div className="logo">
                        <a href="/">
                            <img className="img img-responsive" src="/images/logo.png" alt='logo'/>
                        </a>
                    </div>
                </h3>
                <nav className="nav nav-masthead justify-content-center">
                    <NavLink exact to={"/"} className={"nav-link"} >Home</NavLink>
                    <NavLink to={"/market"} className={"nav-link"}>Market</NavLink>
                    <NavLink to={"/bridge"} className={"nav-link"}>Bridge</NavLink>
                    <NavLink to={"/stats"} className={"nav-link"}>Stats</NavLink>
                    <NavLink to={"/affiliate"} className={"nav-link"}>Affiliate</NavLink>
                </nav>
            </div>
            <div className="inner">
                <div className="row">
                    <div className="col-sm-2">
                    </div>
                    <div className="col-sm-8">
                        <br/>
                        <h1 className="cover-heading">{props.title}</h1>
                    </div>
                    <div className="col-sm-2">
                    </div>
                </div>
            </div>
        </header>
    );
};