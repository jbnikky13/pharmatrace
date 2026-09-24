// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/PharmaTrace.sol";
import "../contracts/PharmaTraceMigration.sol";

contract PharmaTraceMigrationTest is Test {
    PharmaTrace registry;
    PharmaTraceMigration migration;

    address owner = address(0xA11CE);
    address attestor = address(0xBEEF);
    bytes32 batchKey = keccak256("NAFDAC04-2220");
    bytes32 sourceHash = keccak256("solana-record-2220");

    function setUp() public {
        vm.prank(owner);
        registry = new PharmaTrace(address(0x3600000000000000000000000000000000000000));
        vm.prank(owner);
        migration = new PharmaTraceMigration(address(registry));
        vm.prank(owner);
        migration.setAttestor(attestor, true);
    }

    function testMigrationCanBeRecorded() public {
        vm.prank(attestor);
        migration.recordMigration(
            batchKey,
            "4rJojVK6QajDMFy14dpyKomvjJp3DLhkNHRpB1gygY7e",
            "NAFDAC04-2220",
            "5SolanaTransactionSignatureExample",
            sourceHash
        );

        PharmaTraceMigration.Migration memory m = migration.getMigration(batchKey);
        assertTrue(m.exists);
        assertEq(m.arcBatchKey, batchKey);
        assertEq(m.sourceRecord, "NAFDAC04-2220");
        assertEq(m.sourceRecordHash, sourceHash);
        assertEq(m.attestor, attestor);
        assertGt(m.migratedAt, 0);
    }

    function testUnauthorizedCannotMigrate() public {
        vm.prank(address(0x1234));
        vm.expectRevert("NOT_ATTESTOR");
        migration.recordMigration(
            batchKey,
            "solana-program",
            "record",
            "transaction",
            sourceHash
        );
    }

    function testDuplicateArcBatchRejected() public {
        vm.startPrank(attestor);
        migration.recordMigration(batchKey, "program", "record", "tx-1", sourceHash);
        vm.expectRevert("MIGRATION_EXISTS");
        migration.recordMigration(batchKey, "program", "record-2", "tx-2", keccak256("other"));
        vm.stopPrank();
    }

    function testSameSolanaRecordCannotBeMigratedTwice() public {
        vm.startPrank(attestor);
        migration.recordMigration(batchKey, "program", "record", "tx-1", sourceHash);
        vm.expectRevert("SOURCE_ALREADY_MIGRATED");
        migration.recordMigration(
            keccak256("another-arc-batch"),
            "program",
            "record",
            "tx-2",
            sourceHash
        );
        vm.stopPrank();
    }

    function testInvalidSourceDataRejected() public {
        vm.startPrank(attestor);
        vm.expectRevert("EMPTY_SOURCE_TX");
        migration.recordMigration(batchKey, "program", "record", "", sourceHash);
        vm.stopPrank();
    }
}
