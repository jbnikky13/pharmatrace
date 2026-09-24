// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PharmaTrace Migration Attestation
/// @notice Links a historical Solana provenance record to an Arc PharmaTrace batch
/// without pretending that the Arc record itself originated on Solana.
contract PharmaTraceMigration {
    address public owner;
    address public immutable pharmaTrace;

    struct Migration {
        bytes32 arcBatchKey;
        string sourceProgram;
        string sourceRecord;
        string sourceTransaction;
        bytes32 sourceRecordHash;
        uint256 migratedAt;
        address attestor;
        bool exists;
    }

    mapping(bytes32 => Migration) private migrations;
    mapping(bytes32 => bool) public sourceRecordUsed;
    mapping(address => bool) public attestors;

    event AttestorUpdated(address indexed account, bool authorized);
    event ProvenanceMigrated(
        bytes32 indexed arcBatchKey,
        string sourceProgram,
        string sourceRecord,
        string sourceTransaction,
        bytes32 indexed sourceRecordHash,
        address indexed attestor
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyAttestor() {
        require(msg.sender == owner || attestors[msg.sender], "NOT_ATTESTOR");
        _;
    }

    constructor(address pharmaTraceAddress) {
        require(pharmaTraceAddress != address(0), "INVALID_PHARMATRACE");
        owner = msg.sender;
        pharmaTrace = pharmaTraceAddress;
        attestors[msg.sender] = true;
        emit AttestorUpdated(msg.sender, true);
    }

    function setAttestor(address account, bool authorized) external onlyOwner {
        require(account != address(0), "INVALID_ATTESTOR");
        attestors[account] = authorized;
        emit AttestorUpdated(account, authorized);
    }

    function recordMigration(
        bytes32 arcBatchKey,
        string calldata sourceProgram,
        string calldata sourceRecord,
        string calldata sourceTransaction,
        bytes32 sourceRecordHash
    ) external onlyAttestor {
        require(arcBatchKey != bytes32(0), "INVALID_ARC_BATCH");
        require(bytes(sourceProgram).length > 0, "EMPTY_SOURCE_PROGRAM");
        require(bytes(sourceRecord).length > 0, "EMPTY_SOURCE_RECORD");
        require(bytes(sourceTransaction).length > 0, "EMPTY_SOURCE_TX");
        require(sourceRecordHash != bytes32(0), "INVALID_SOURCE_HASH");
        require(!migrations[arcBatchKey].exists, "MIGRATION_EXISTS");
        require(!sourceRecordUsed[sourceRecordHash], "SOURCE_ALREADY_MIGRATED");

        migrations[arcBatchKey] = Migration(
            arcBatchKey,
            sourceProgram,
            sourceRecord,
            sourceTransaction,
            sourceRecordHash,
            block.timestamp,
            msg.sender,
            true
        );
        sourceRecordUsed[sourceRecordHash] = true;

        emit ProvenanceMigrated(
            arcBatchKey,
            sourceProgram,
            sourceRecord,
            sourceTransaction,
            sourceRecordHash,
            msg.sender
        );
    }

    function getMigration(bytes32 arcBatchKey) external view returns (Migration memory) {
        return migrations[arcBatchKey];
    }

    function hasMigration(bytes32 arcBatchKey) external view returns (bool) {
        return migrations[arcBatchKey].exists;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_OWNER");
        owner = newOwner;
    }
}
