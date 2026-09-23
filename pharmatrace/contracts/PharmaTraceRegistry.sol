// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PharmaTraceRegistry {
    struct Batch {
        string drugId;
        string drugName;
        string manufacturer;
        string manufactureDate;
        string expiryDate;
        uint256 quantity;
        uint8 status;
        address authority;
        uint256 registeredAt;
        bool exists;
    }

    address public immutable owner;
    mapping(bytes32 => Batch) private batches;

    event BatchRegistered(bytes32 indexed batchKey, string batchId, string drugName, string manufacturer, address indexed authority);
    event BatchStatusUpdated(bytes32 indexed batchKey, uint8 status);
    event BatchFlagged(bytes32 indexed batchKey, address indexed authority);

    error NotOwner();
    error BatchAlreadyExists();
    error BatchNotFound();
    error InvalidBatchId();
    error InvalidStatus();

    constructor() { owner = msg.sender; }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function registerBatch(
        string calldata batchId,
        string calldata drugName,
        string calldata manufacturer,
        string calldata manufactureDate,
        string calldata expiryDate,
        uint256 quantity
    ) external onlyOwner returns (bytes32 batchKey) {
        if (bytes(batchId).length == 0) revert InvalidBatchId();
        batchKey = keccak256(bytes(batchId));
        if (batches[batchKey].exists) revert BatchAlreadyExists();

        batches[batchKey] = Batch({
            drugId: batchId,
            drugName: drugName,
            manufacturer: manufacturer,
            manufactureDate: manufactureDate,
            expiryDate: expiryDate,
            quantity: quantity,
            status: 1,
            authority: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        emit BatchRegistered(batchKey, batchId, drugName, manufacturer, msg.sender);
    }

    function verifyBatch(string calldata batchId)
        external view
        returns (
            bool exists,
            string memory drugId,
            string memory drugName,
            string memory manufacturer,
            string memory manufactureDate,
            string memory expiryDate,
            uint256 quantity,
            uint8 status,
            address authority,
            uint256 registeredAt
        )
    {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        return (batch.exists, batch.drugId, batch.drugName, batch.manufacturer,
            batch.manufactureDate, batch.expiryDate, batch.quantity, batch.status,
            batch.authority, batch.registeredAt);
    }

    function updateStatus(string calldata batchId, uint8 status) external onlyOwner {
        if (status == 0 || status > 4) revert InvalidStatus();
        bytes32 batchKey = keccak256(bytes(batchId));
        if (!batches[batchKey].exists) revert BatchNotFound();
        batches[batchKey].status = status;
        emit BatchStatusUpdated(batchKey, status);
    }

    function flagBatch(string calldata batchId) external onlyOwner {
        bytes32 batchKey = keccak256(bytes(batchId));
        if (!batches[batchKey].exists) revert BatchNotFound();
        batches[batchKey].status = 99;
        emit BatchFlagged(batchKey, msg.sender);
    }
}
