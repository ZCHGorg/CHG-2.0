pragma solidity ^0.4.18;

//import "openzeppelin-solidity/contracts/math/SafeMath.sol";
//import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
//import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./SafeMath.sol";
import "./Ownable.sol";
import "./ERC20.sol";

/**
 * @title ERC20Bridge
 * @dev Ethereum ERC20 Coin to Charg Bridge
 */
contract ERC20Bridge is Ownable {

	using SafeMath for uint;

    uint public minFee =  1 * 10**18; // the fee depends on ethereum gas price
    uint public maxFee = 20 * 10**18; // 20CHG~0.02ETH

    uint public minValue = 10 * 10**18; // min.transfer value
    uint public maxValue = 10000 * 10**18; // max.transfer value

    uint public validatorsCount = 0;
    uint public validationsRequired = 2;

    ERC20 private erc20Instance;  

    struct Transaction {
		address initiator;
		uint amount;
		uint fee;
		uint validated;
		bool completed;
	}

    event FundsReceived(address indexed initiator, uint amount);

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    event Validated(bytes32 indexed txHash, address indexed validator, uint validatedCount, bool completed, uint fee);

    mapping (address => bool) public isValidator;

    mapping (bytes32 => Transaction) public transactions;
	mapping (bytes32 => mapping (address => bool)) public validatedBy; // is validated by 

	function ERC20Bridge(address _addr) public {
		erc20Instance = ERC20(_addr);
    }

    //fallback
	function() external payable {
		revert();
	}

	function setMinValue( uint _value ) onlyOwner public {
        require (_value > 0);
        minValue = _value;
	}

	function setMaxValue( uint _value ) onlyOwner public {
        require (_value > 0);
        maxValue = _value;
	}

	function setMinFee( uint _value ) onlyOwner public {
        require (_value > 0);
        minFee = _value;
	}

	function setMaxFee( uint _value ) onlyOwner public {
        require (_value > 0);
        maxFee = _value;
	}

	function setValidationsRequired( uint value ) onlyOwner public {
        require (value > 0);
        validationsRequired = value;
	}

	function addValidator( address _validator ) onlyOwner public {
        require (!isValidator[_validator]);
        isValidator[_validator] = true;
        validatorsCount = validatorsCount.add(1);
        ValidatorAdded(_validator);
	}

	function removeValidator( address _validator ) onlyOwner public {
        require (isValidator[_validator]);
        isValidator[_validator] = false;
        validatorsCount = validatorsCount.sub(1);
        ValidatorRemoved(_validator);
	}

	function validate(bytes32 _txHash, address _initiator, uint _amount, uint _fee) public {
        
        require ( isValidator[msg.sender]);
        require ( !transactions[_txHash].completed );
        require ( !validatedBy[_txHash][msg.sender] );
        require ( _amount>=minValue && _amount<=maxValue ); //not correct value
        require ( _fee>=minFee && _fee<=maxFee ); //not correct fee

        if ( transactions[_txHash].initiator == address(0) ) {
            require ( _amount > 0 && erc20Instance.balanceOf(address(this)) >= _amount );
            transactions[_txHash].initiator = _initiator;
            transactions[_txHash].amount = _amount;
            transactions[_txHash].fee = _fee;
            transactions[_txHash].validated = 1;

        } else {
            require ( transactions[_txHash].amount > 0 );
            require ( erc20Instance.balanceOf(address(this)) >= transactions[_txHash].amount );
            require ( _initiator == transactions[_txHash].initiator );
            //require ( transactions[_txHash].validated < validationsRequired );
            transactions[_txHash].validated = transactions[_txHash].validated.add(1);
            transactions[_txHash].fee = transactions[_txHash].fee.add(_fee);
        }
        validatedBy[_txHash][msg.sender] = true;
        erc20Instance.transfer(msg.sender, _fee);
        if (transactions[_txHash].validated >= validationsRequired) {
            erc20Instance.transfer(_initiator, transactions[_txHash].amount.sub(transactions[_txHash].fee));
            transactions[_txHash].completed = true;
        }
        Validated(_txHash, msg.sender, transactions[_txHash].validated, transactions[_txHash].completed, _fee);
	}
}