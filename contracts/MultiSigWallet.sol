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



}