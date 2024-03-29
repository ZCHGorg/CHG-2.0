pragma solidity >=0.4.18 <0.7.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  function Migrations() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
