pragma solidity ^0.4.18;

import "./Ownable.sol";

/**
 * @title Currency Oracle
 * @dev Stores currencies rates from outside
 */
contract CurrencyOracleContract is Ownable {

    uint public currenciesCount = 0;

    mapping (uint => uint) public rates;
    mapping (uint => Currency) public currencies;

    struct Currency {
        string name;
        string symbol;
    }

	event RateChanged  ( uint currencyId, uint rate );

	function CurrencyOracleContract() public {

		// default currencies
		currencies[currenciesCount].name = 'Charg Coin';
		currencies[currenciesCount].symbol = 'CHG';
        rates[currenciesCount] = 1 * 10**18;
		currenciesCount++;

		currencies[currenciesCount].name = 'Ethereum';
		currencies[currenciesCount].symbol = 'ETH';
		currenciesCount++;

		currencies[currenciesCount].name = 'Bitcoin';
		currencies[currenciesCount].symbol = 'BTC';
		currenciesCount++;

		currencies[currenciesCount].name = 'Litecoin';
		currencies[currenciesCount].symbol = 'LTC';
		currenciesCount++;

		currencies[currenciesCount].name = 'US Dollar';
		currencies[currenciesCount].symbol = 'USD';
		currenciesCount++;

    }

	function() public payable {
		revert();
	}

	function addCurrency( string name, string symbol ) onlyOwner public {

		currencies[currenciesCount].name = name;
		currencies[currenciesCount].symbol = symbol;
		currenciesCount++;
	}

	function setRate( uint currencyId, uint rate ) onlyOwner public {

		rates[currencyId] = rate;
        RateChanged ( currencyId, rate );
	}


}