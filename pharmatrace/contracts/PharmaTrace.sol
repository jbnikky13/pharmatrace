// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PharmaTrace {
    uint8 public constant MANUFACTURED = 1;
    uint8 public constant DISTRIBUTION = 2;
    uint8 public constant PHARMACY = 3;
    uint8 public constant DISPENSED = 4;
    uint8 public constant FLAGGED = 99;

    address public owner;
    address public immutable usdc;

    struct Batch {
        string batchId;
        string drugName;
        string manufacturer;
        string manufactureDate;
        string expiryDate;
        uint256 quantity;
        uint8 status;
        address authority;
        address custodian;
        uint256 registeredAt;
        bool exists;
    }

    mapping(bytes32 => Batch) private batches;
    mapping(address => bool) public authorizedRegistrars;

    event RegistrarUpdated(address indexed account, bool authorized);
    event BatchRegistered(bytes32 indexed batchKey, string batchId, address indexed authority);
    event StatusUpdated(bytes32 indexed batchKey, uint8 status, address indexed actor);
    event CustodyTransferred(bytes32 indexed batchKey, address indexed from, address indexed to);
    event BatchFlagged(bytes32 indexed batchKey, address indexed actor, string reason);
    event SettlementRecorded(bytes32 indexed batchKey, address indexed payer, address indexed payee, uint256 amount, bytes32 settlementReference);

    modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
    modifier onlyRegistrar() { require(authorizedRegistrars[msg.sender], "NOT_REGISTRAR"); _; }

    constructor(address usdcToken) {
        owner = msg.sender;
        usdc = usdcToken;
        authorizedRegistrars[msg.sender] = true;
        emit RegistrarUpdated(msg.sender, true);
    }

    function setRegistrar(address account, bool authorized) external onlyOwner {
        authorizedRegistrars[account] = authorized;
        emit RegistrarUpdated(account, authorized);
    }

    function registerBatch(
        string calldata batchId,
        string calldata drugName,
        string calldata manufacturer,
        string calldata manufactureDate,
        string calldata expiryDate,
        uint256 quantity
    ) external onlyRegistrar returns (bytes32 batchKey) {
        require(bytes(batchId).length > 0, "EMPTY_BATCH_ID");
        require(quantity > 0, "INVALID_QUANTITY");
        batchKey = keccak256(bytes(batchId));
        require(!batches[batchKey].exists, "BATCH_EXISTS");

        batches[batchKey] = Batch(
            batchId, drugName, manufacturer, manufactureDate, expiryDate,
            quantity, MANUFACTURED, msg.sender, msg.sender, block.timestamp, true
        );
        emit BatchRegistered(batchKey, batchId, msg.sender);
    }

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        return batches[keccak256(bytes(batchId))];
    }

    function batchExists(string calldata batchId) external view returns (bool) {
        return batches[keccak256(bytes(batchId))].exists;
    }

    function updateStatus(string calldata batchId, uint8 status) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.authority || msg.sender == batch.custodian || msg.sender == owner, "NOT_AUTHORIZED");
        require(status != 0, "INVALID_STATUS");
        batch.status = status;
        emit StatusUpdated(keccak256(bytes(batchId)), status, msg.sender);
    }

    function transferCustody(string calldata batchId, address newCustodian) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.custodian || msg.sender == owner, "NOT_CUSTODIAN");
        require(newCustodian != address(0), "INVALID_CUSTODIAN");
        address previous = batch.custodian;
        batch.custodian = newCustodian;
        emit CustodyTransferred(keccak256(bytes(batchId)), previous, newCustodian);
    }

    function flagBatch(string calldata batchId, string calldata reason) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.authority || msg.sender == batch.custodian || msg.sender == owner, "NOT_AUTHORIZED");
        batch.status = FLAGGED;
        emit BatchFlagged(keccak256(bytes(batchId)), msg.sender, reason);
    }

    function recordSettlement(string calldata batchId, address payee, uint256 amount, bytes32 reference) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.custodian || msg.sender == batch.authority || msg.sender == owner, "NOT_AUTHORIZED");
        require(payee != address(0) && amount > 0, "INVALID_SETTLEMENT");
        require(IERC20(usdc).transferFrom(msg.sender, payee, amount), "USDC_TRANSFER_FAILED");
        emit SettlementRecorded(keccak256(bytes(batchId)), msg.sender, payee, amount, reference);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_OWNER");
        owner = newOwner;
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
