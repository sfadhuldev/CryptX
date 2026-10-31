// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { SecureCounter } from "../src/SecureCounter.sol";

/// @notice Deploys SecureCounter to the selected network.
/// @dev Run it against Anvil with a local development private key (see README).
contract DeploySecureCounter is Script {
    function run() external returns (SecureCounter secureCounter) {
        // Start sending real transactions. The sender comes from the CLI
        // --private-key / --sender option, not from this file.
        vm.startBroadcast();

        // The deployer of this transaction becomes the owner.
        secureCounter = new SecureCounter();

        // Stop recording transactions.
        vm.stopBroadcast();

        // Helpful terminal output for local development.
        console.log("SecureCounter deployed at:", address(secureCounter));
        console.log("Owner address:", secureCounter.owner());
        console.log("Initial number:", secureCounter.number());
    }
}
