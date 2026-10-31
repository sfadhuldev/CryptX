// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { Counter } from "../src/Counter.sol";

/// @notice Deploys the original Counter contract to the selected network.
contract CounterScript is Script {
    Counter public counter;

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        counter = new Counter();

        vm.stopBroadcast();
    }
}
