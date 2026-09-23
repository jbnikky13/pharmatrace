// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import "../contracts/PharmaTrace.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender] = amount; return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract PharmaTraceTest is Test {
    PharmaTrace registry;
    MockUSDC usdc;
    address manufacturer = address(0xBEEF);
    address pharmacy = address(0xCAFE);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new PharmaTrace(address(usdc));
        registry.setRegistrar(manufacturer, true);
    }

    function testRegisterAndVerifyBatch() public {
        vm.prank(manufacturer);
        registry.registerBatch("NAFDAC04-2220","Amoxicillin 500mg Capsules","Emzor Pharmaceuticals Ltd","2026-01-10","2028-01-10",50000);
        PharmaTrace.Batch memory batch = registry.getBatch("NAFDAC04-2220");
        assertTrue(batch.exists);
        assertEq(batch.batchId, "NAFDAC04-2220");
        assertEq(batch.quantity, 50000);
        assertEq(batch.status, registry.MANUFACTURED());
        assertEq(batch.authority, manufacturer);
    }

    function testDuplicateBatchRejected() public {
        vm.startPrank(manufacturer);
        registry.registerBatch("DUP-1","Test Drug","Maker","2026-01-01","2028-01-01",10);
        vm.expectRevert("BATCH_EXISTS");
        registry.registerBatch("DUP-1","Test Drug","Maker","2026-01-01","2028-01-01",10);
        vm.stopPrank();
    }

    function testCustodyAndFlagging() public {
        vm.prank(manufacturer);
        registry.registerBatch("TRACE-1","Test Drug","Maker","2026-01-01","2028-01-01",10);
        vm.prank(manufacturer);
        registry.transferCustody("TRACE-1", pharmacy);
        vm.prank(pharmacy);
        registry.updateStatus("TRACE-1", registry.PHARMACY());
        PharmaTrace.Batch memory batch = registry.getBatch("TRACE-1");
        assertEq(batch.custodian, pharmacy);
        assertEq(batch.status, registry.PHARMACY());
        vm.prank(pharmacy);
        registry.flagBatch("TRACE-1", "Packaging mismatch");
        batch = registry.getBatch("TRACE-1");
        assertEq(batch.status, registry.FLAGGED());
    }

    function testUSDCSettlement() public {
        usdc.mint(manufacturer, 100e6);
        vm.prank(manufacturer);
        usdc.approve(address(registry), 25e6);
        vm.prank(manufacturer);
        registry.registerBatch("PAY-1","Test Drug","Maker","2026-01-01","2028-01-01",10);
        vm.prank(manufacturer);
        registry.recordSettlement("PAY-1", pharmacy, 25e6, keccak256("invoice-1"));
        assertEq(usdc.balanceOf(pharmacy), 25e6);
        assertEq(usdc.balanceOf(manufacturer), 75e6);
    }
}
