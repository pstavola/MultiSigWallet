//SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount, uint balance);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(address indexed owner, uint indexed txId);
    event Submit(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );

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

    modifier txnExist(uint _txId) {
        require(_txId < transactions.length, "transaction does not exist");
        _;
    }

    constructor(address[] memory _owners, uint _approvalsRequired) payable {
        require(_owners.length > 0, "MultiSigWallet must have at least 1 owner");
        require(_approvalsRequired <= _owners.length, "number of approvals must be less or equal to number of owners");

        owners = _owners;

        for(uint i; i < _owners.length; i++){
            require(_owners[i] != address(0), "owner cannot be address(0)");
            require(!isOwner[_owners[i]], "duplicated owner");

            isOwner[_owners[i]] = true;
        }


        approvalsRequired = _approvalsRequired;
    }

    function submitTxn(
        address _to,
        bytes calldata _data,
        uint _amount
    ) public onlyOwner returns(uint txId) {

        txId = transactions.length;
        Transaction memory transaction = Transaction({to: _to, data: _data, amount: _amount, executed: false, numOfApprovals: 0});
        transactions.push(transaction);

        emit Submit(msg.sender, txId, _to, _amount, _data);
    }

    function approveTxn(uint _txId) public onlyOwner notExecuted(_txId) txnExist(_txId) {
        require(!approvals[_txId][msg.sender], "already approved");

        approvals[_txId][msg.sender] = true;
        Transaction storage txn = transactions[_txId];
        txn.numOfApprovals += 1;

        emit Approve(msg.sender, _txId);
    }

    function revokeApproval(uint _txId) public onlyOwner notExecuted(_txId) txnExist(_txId) {
        require(approvals[_txId][msg.sender], "not yet approved");

        approvals[_txId][msg.sender] = false;
        Transaction storage txn = transactions[_txId];
        txn.numOfApprovals -= 1;

        emit Revoke(msg.sender, _txId);
    }

    function executeTxn(uint _txId) public payable onlyOwner notExecuted(_txId) txnExist(_txId) returns(bool success) {
        Transaction storage txn = transactions[_txId];
        require(txn.numOfApprovals >= approvalsRequired, "not enough approvals");

        require(address(this).balance > txn.amount, "not enough ETH");

        txn.executed = true;
        (success, ) = payable(txn.to).call{value: txn.amount}(txn.data);

        emit Execute(msg.sender, _txId);
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }
}