//SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title MultiSigWallet
 * @author Patrizio Stavola
 * @notice A shared wallet with which transactions must be approved by a predetermined set of users before being sent onchain.
*/
contract MultiSigWallet {

    ///@notice structure that defines a transaction
    struct Transaction {
        address to;
        bytes data;
        uint amount;
        bool executed;
        uint numOfApprovals;
    }

    /* ========== EVENTS ========== */

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

    /* ========== GLOBAL VARIABLES ========== */

    ///@notice array of addresses to handle wallet owners
    address[] public owners;
    ///@notice mapping to easily identify if an address is also an owner without iterating the array of woners
    mapping (address => bool) public isOwner;
    ///@notice array of Transaction to handle transactions
    Transaction[] public transactions;
    ///@notice mapping to handle owners approvals. It maps a transaction id to a mapping of addresses and the corrisponding values for approval
    mapping(uint => mapping(address => bool)) public approvals;
    ///@notice number of approvals required to send a transaction
    uint public approvalsRequired;

    /* ========== MODIFIERS ========== */

    /**
     * @notice check that only wallet signers can invoke functions.
    */
    modifier onlyOwner() {
        require(isOwner[msg.sender], "not an owner");
        _;
    }

    /**
     * @notice check that a transaction has not been already sent.
     * @param _txId transaction id
    */
    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "already executed");
        _;
    }

    /**
     * @notice check if a transaction exists.
     * @param _txId transaction id
    */
    modifier txnExist(uint _txId) {
        require(_txId < transactions.length, "transaction does not exist");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    /**
     * @notice initializing a multisig wallet with the list of owners and the amount of required approvals per each transaction.
     * @param _owners and arrays containing the list of owners' addresses
     * @param _approvalsRequired number of approvals required
    */
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

    /* ========== FUNCTIONS ========== */

    /**
     * @notice create a pending transaction to be approved by signers. Only signers can submit transactions.
     * @param _to transaction receiver
     * @param _data transaction data
     * @param _amount transaction amount
     * @return txId transaction id
    */
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

    /**
     * @notice approve an existing transaction. Only signers can approve transactions. Transaction must exist and not already sent.
     * @param _txId transaction id
    */
    function approveTxn(uint _txId) public onlyOwner txnExist(_txId) notExecuted(_txId) {
        require(!approvals[_txId][msg.sender], "already approved");

        approvals[_txId][msg.sender] = true;
        Transaction storage txn = transactions[_txId];
        txn.numOfApprovals += 1;

        emit Approve(msg.sender, _txId);
    }

    /**
     * @notice revoke an already approved transaction.  Only signers can revoke transactions. Transaction must exist and not already sent.
     * @param _txId transaction id
    */
    function revokeApproval(uint _txId) public onlyOwner txnExist(_txId) notExecuted(_txId) {
        require(approvals[_txId][msg.sender], "not yet approved");

        approvals[_txId][msg.sender] = false;
        Transaction storage txn = transactions[_txId];
        txn.numOfApprovals -= 1;

        emit Revoke(msg.sender, _txId);
    }

    /**
     * @notice send a transaction that has the required number of approvals.  Only signers can send transactions. Transaction must exist and not already sent.
     * @param _txId transaction id
    */
    function executeTxn(uint _txId) public payable onlyOwner txnExist(_txId) notExecuted(_txId) returns(bool success) {
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