// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/PharmaTraceMigration.sol";

contract DeployPharmaTraceMigration is Script {
    address constant PHARMATRACE = 0x41aBE791Cb924dBf5F4f2776c664491058eE1848;

    function run() external returns (PharmaTraceMigration deployed) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        deployed = new PharmaTraceMigration(PHARMATRACE);
        vm.stopBroadcast();
        console2.log("PharmaTraceMigration deployed:", address(deployed));
    }
}
