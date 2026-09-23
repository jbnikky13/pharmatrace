// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../contracts/PharmaTrace.sol";

contract DeployPharmaTrace is Script {
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    function run() external returns (PharmaTrace deployed) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        deployed = new PharmaTrace(ARC_USDC);
        vm.stopBroadcast();
    }
}
