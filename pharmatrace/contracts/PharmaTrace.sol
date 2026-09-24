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
    mapping(address => bool) public manufacturerVerified;

    struct ManufacturerApplication {
        address wallet;
        string companyName;
        string licenseNumber;
        string contactReference;
        uint8 status; // 0 pending, 1 verified, 2 rejected
        uint256 submittedAt;
    }
    mapping(address => ManufacturerApplication) public manufacturerApplications;
    address[] private applicantWallets;

    struct HistoryEntry {
        uint8 status;
        address actor;
        uint256 timestamp;
        string reason;
    }

    mapping(bytes32 => HistoryEntry[]) private batchHistory;

    event RegistrarUpdated(address indexed account, bool authorized);
    event ManufacturerVerified(address indexed account, bool verified);
    event ManufacturerApplicationSubmitted(address indexed account, string companyName, string licenseNumber);
    event ManufacturerApplicationReviewed(address indexed account, bool approved);
    event BatchRegistered(bytes32 indexed batchKey, string batchId, address indexed authority);
    event StatusUpdated(bytes32 indexed batchKey, uint8 status, address indexed actor);
    event CustodyTransferred(bytes32 indexed batchKey, address indexed from, address indexed to);
    event BatchFlagged(bytes32 indexed batchKey, address indexed actor, string reason);
    event SettlementRecorded(bytes32 indexed batchKey, address indexed payer, address indexed payee, uint256 amount, bytes32 settlementReference);

    modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
    modifier onlyRegistrar() { require(msg.sender == owner || manufacturerVerified[msg.sender], "NOT_VERIFIED_MANUFACTURER"); _; }

    constructor(address usdcToken) {
        require(usdcToken != address(0), "INVALID_USDC");
        owner = msg.sender;
        usdc = usdcToken;
        authorizedRegistrars[msg.sender] = true;
        emit RegistrarUpdated(msg.sender, true);
    }

    function applyForManufacturer(string calldata companyName, string calldata licenseNumber, string calldata contactReference) external {
        require(bytes(companyName).length > 1, "INVALID_COMPANY");
        require(bytes(licenseNumber).length > 1, "INVALID_LICENSE");
        ManufacturerApplication storage a = manufacturerApplications[msg.sender];
        if (a.wallet == address(0)) applicantWallets.push(msg.sender);
        a.wallet = msg.sender;
        a.companyName = companyName;
        a.licenseNumber = licenseNumber;
        a.contactReference = contactReference;
        a.status = 0;
        a.submittedAt = block.timestamp;
        emit ManufacturerApplicationSubmitted(msg.sender, companyName, licenseNumber);
    }

    function getManufacturerApplication(address account) external view returns (ManufacturerApplication memory) {
        return manufacturerApplications[account];
    }

    function getApplicantWallets() external view returns (address[] memory) {
        return applicantWallets;
    }

    function setRegistrar(address account, bool authorized) external onlyOwner {
        require(account != address(0), "INVALID_REGISTRAR");
        authorizedRegistrars[account] = authorized;
        emit RegistrarUpdated(account, authorized);
    }

    function setManufacturerVerified(address account, bool verified) external onlyOwner {
        require(account != address(0), "INVALID_MANUFACTURER");
        manufacturerVerified[account] = verified;
        authorizedRegistrars[account] = verified;
        emit ManufacturerVerified(account, verified);
        emit RegistrarUpdated(account, verified);
        ManufacturerApplication storage a = manufacturerApplications[account];
        a.wallet = account;
        a.status = verified ? 1 : 2;
        emit ManufacturerApplicationReviewed(account, verified);
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
        batchHistory[batchKey].push(HistoryEntry(MANUFACTURED, msg.sender, block.timestamp, "Batch registered"));
        emit BatchRegistered(batchKey, batchId, msg.sender);
    }

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        return batches[keccak256(bytes(batchId))];
    }

    function getBatchHistory(string calldata batchId) external view returns (HistoryEntry[] memory) {
        return batchHistory[keccak256(bytes(batchId))];
    }

    function batchExists(string calldata batchId) external view returns (bool) {
        return batches[keccak256(bytes(batchId))].exists;
    }

    function updateStatus(string calldata batchId, uint8 status) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.authority || msg.sender == batch.custodian || msg.sender == owner, "NOT_AUTHORIZED");
        require(_isValidStatus(status), "INVALID_STATUS");
        batch.status = status;
        batchHistory[keccak256(bytes(batchId))].push(HistoryEntry(status, msg.sender, block.timestamp, "Status updated"));
        emit StatusUpdated(keccak256(bytes(batchId)), status, msg.sender);
    }

    function transferCustody(string calldata batchId, address newCustodian) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.custodian || msg.sender == owner, "NOT_CUSTODIAN");
        require(newCustodian != address(0), "INVALID_CUSTODIAN");
        address previous = batch.custodian;
        batch.custodian = newCustodian;
        batchHistory[keccak256(bytes(batchId))].push(HistoryEntry(batch.status, msg.sender, block.timestamp, "Custody transferred"));
        emit CustodyTransferred(keccak256(bytes(batchId)), previous, newCustodian);
    }

    function flagBatch(string calldata batchId, string calldata reason) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.authority || msg.sender == batch.custodian || msg.sender == owner, "NOT_AUTHORIZED");
        batch.status = FLAGGED;
        batchHistory[keccak256(bytes(batchId))].push(HistoryEntry(FLAGGED, msg.sender, block.timestamp, reason));
        emit BatchFlagged(keccak256(bytes(batchId)), msg.sender, reason);
    }

    function recordSettlement(string calldata batchId, address payee, uint256 amount, bytes32 settlementReference) external {
        Batch storage batch = batches[keccak256(bytes(batchId))];
        require(batch.exists, "BATCH_NOT_FOUND");
        require(msg.sender == batch.custodian || msg.sender == batch.authority || msg.sender == owner, "NOT_AUTHORIZED");
        require(payee != address(0) && amount > 0, "INVALID_SETTLEMENT");
        require(IERC20(usdc).transferFrom(msg.sender, payee, amount), "USDC_TRANSFER_FAILED");
        emit SettlementRecorded(keccak256(bytes(batchId)), msg.sender, payee, amount, settlementReference);
    }

    function _isValidStatus(uint8 status) internal pure returns (bool) {
        return status >= MANUFACTURED && status <= DISPENSED || status == FLAGGED;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_OWNER");
        owner = newOwner;
    }
}


interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
