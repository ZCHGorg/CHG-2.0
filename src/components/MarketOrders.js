import React, {useState, useEffect} from "react";
import {Button} from "react-bootstrap";
import {BuyOrderModal} from "./BuyOrderModal"
import {SellOrderModal} from "./SellOrderModal"
import {BuyModal} from "./BuyModal"
import {SellModal} from "./SellModal"


const Row = ({ order, onClick }) => (
    <tr key={order.index} onClick={onClick}>
      <td hash={order.hash}>
        {Number(order.rate).toFixed(7)}
      </td>
      <td>
        {Number(order.amount).toFixed(2)}
      </td>
    </tr>
);


export const MarketOrders = ({context, signResult}) => {

    const [buyOrders, setBuyOrders] = useState([]);
    const [sellOrders, setSellOrders] = useState([]);

    const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
    const [showSellOrderModal, setShowSellOrderModal] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(false);

    const handleBuyOrder = (amountGive, amountGet, expire) => {
        context.dapp.buyOrder(10**18 * amountGive, 10**18 * amountGet, expire, signResult);
    }

    const handleSellOrder = (amountGive, amountGet, expire) => {
        context.dapp.sellOrder(10**18 * amountGive, 10**18 * amountGet, expire, signResult);
    }

    const handleBuy = (order, value) => {
        const valueWei = 10**18 * Number(value);
        context.dapp.buy(order.hash, valueWei, signResult);
    }

    const handleSell = (order, value) => {
        const valueWei = 10**18 * Number(value);
        context.dapp.sell(order.hash, valueWei, signResult);
    }

    const handleCancelBuyOrder = (order) => {
        context.dapp.cancelBuyOrder(order.hash);
    }

    const handleCancelSellOrder = (order) => {
        context.dapp.cancelSellOrder(order.hash);
    }

    const updateTables = () => {
        if (context && context.dapp) {
            
            const sellOrdersTable = Object.entries(context.dapp.sellOrders).map(([hash, o], i) => ({...o, amount:o.give, index:i}))
                .filter(o=>o.amount>0.001).sort((a, b) => (a.rate > b.rate) ? 1 : (a.rate === b.rate) ? ((a.volume > b.volume) ? 1 : -1) : -1 );
            setSellOrders(sellOrdersTable);

            const buyOrdersTable = Object.entries(context.dapp.buyOrders).map(([hash, o], i) => ({...o, amount:o.get, index:i}))
                .filter(o=>o.amount>0.001).sort((a, b) => (a.rate < b.rate) ? 1 : (a.rate === b.rate) ? ((a.volume > b.volume) ? 1 : -1) : -1 );
            setBuyOrders(buyOrdersTable);
        }
    }
    
    useEffect(() => {
        updateTables();
    },[context]);

    if (context && context.dapp) {
        context.dapp.on('updateOrders', updateTables);
    }

    return (
    <div className="card-deck mb-3 text-center">
        <div className="card mb-6 shadow-sm">
            <div className="card-header">
                <h4 className="my-0 font-weight-normal">Sell Orders</h4>
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col">
                        <div className="tableFixHead">
                        <table className="table table-hover table-dark">
                            <thead>
                                <tr>
                                <th scope="col">Rate</th>
                                <th scope="col">Volume</th>
                                </tr>
                            </thead>
                            <tbody id="sell-orders-table">
                                {sellOrders.map(order => (
                                    <Row key={order.hash} order={order} 
                                        onClick={()=>{
                                            setCurrentOrder(order);
                                            setShowBuyModal(true);
                                        }} 
                                    />
                                ))}
                            </tbody>
                        </table>                                                                    
                        </div>
                        <Button variant="outline-primary" size="lg" block onClick={()=>setShowSellOrderModal(true)}>
                            New Sell Order
                        </Button>
                    </div>                            
                </div>
            </div>
        </div>

        <div className="card mb-6 shadow-sm">
            <div className="card-header">
                <h4 className="my-0 font-weight-normal">Buy Orders</h4>
            </div>
            <div className="card-body">

                <div className="row">
                    <div className="col">
                        <div className="tableFixHead">
                        <table className="table table-hover table-dark">
                            <thead>
                                <tr>
                                <th scope="col">Rate</th>
                                <th scope="col">Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {buyOrders.map(order => (
                                    <Row key={order.hash} order={order} 
                                        onClick={()=>{
                                            setCurrentOrder(order);
                                            setShowSellModal(true);
                                        }} 
                                    />
                                ))}
                            </tbody>
                        </table>                                                                    
                        </div>
                        <Button variant="outline-primary" size="lg" block onClick={()=>setShowBuyOrderModal(true)}>
                            New Buy Order
                        </Button>
                    </div>                            
                </div>

            </div>
        </div>
        <BuyOrderModal
            show = {showBuyOrderModal}
            setShow = {setShowBuyOrderModal}
            handleAction = {handleBuyOrder}
        />
        <SellOrderModal
            show = {showSellOrderModal}
            setShow = {setShowSellOrderModal}
            handleAction = {handleSellOrder}
        />
        <BuyModal
            show = {showBuyModal}
            setShow = {setShowBuyModal}
            order = {currentOrder}
            value = {0}
            handleBuy = {handleBuy}
            handleCancelSellOrder = {handleCancelSellOrder}
        />
        <SellModal
            show = {showSellModal}
            setShow = {setShowSellModal}
            order = {currentOrder}
            value = {0}
            handleSell = {handleSell}
            handleCancelBuyOrder = {handleCancelBuyOrder}
        />
    </div>
    )
}
