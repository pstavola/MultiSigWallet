//SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);

    address[] public owners;
    mapping (address => bool) public isOwner;

    struct Transaction {
        address to;
        bytes data;
        uint amount;
        bool executed;
        uint numOfApprovals;
    }

    Transaction[] public transactions;

    mapping(uint => mapping(address => bool)) public approvals;

    uint public approvalsRequired;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not an owner");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "already executed");
        _;
    }

    constructor(address[] memory _owners, uint _approvalsRequired) {
        owners = _owners;

        for(uint i; i < _owners.length; i++){
            require(_owners[i] != address(0), "owner cannot be address(0)");
            require(!isOwner[_owners[i]], "duplicated owner");

            isOwner[_owners[i]] = true;
        }

        require(_approvalsRequired <= _owners.length, "number of approvals required is too big");

        approvalsRequired = _approvalsRequired;
    }

    function submitTxn(
        address _to,
        bytes calldata _data,
        uint _amount
    ) public onlyOwner returns(uint txId) {

        txId = transactions.length;
        Transaction memory transaction = Transaction(_to, _data, _amount, false, approvalsRequired);
        transactions.push(transaction);

        emit Submit(txId);
    }

    function approveTxn(uint _txId) public onlyOwner notExecuted(_txId) {
        require(!approvals[_txId][msg.sender], "already approved");

        approvals[_txId][msg.sender] = true;

        emit Approve(msg.sender, _txId);
    }

    function revokeApproval(uint _txId) public onlyOwner notExecuted(_txId) {
        require(approvals[_txId][msg.sender], "not yet approved");

        approvals[_txId][msg.sender] = false;

        emit Revoke(msg.sender, _txId);
    }

    function getApprovalsCount(uint _txId) internal view returns(uint){
        return transactions[_txId].numOfApprovals;
    }

    function executeTxn(uint _txId) public payable onlyOwner notExecuted(_txId) returns(bool) {
        require(getApprovalsCount(_txId) >= approvalsRequired, "not enough approvals");

        Transaction storage txn = transactions[_txId];

        require(address(this).balance > txn.amount, "not enough ETH");

        (bool success, ) = payable(txn.to).call{value: txn.amount}(txn.data);
        if(success){
            txn.executed = true;
            emit Execute(_txId);
            return success;
        } else{
            return success;
        }
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}