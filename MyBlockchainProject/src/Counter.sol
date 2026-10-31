// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Counter
/// @notice The original Foundry starter contract. It is intentionally simple and
///         has NO access control. See SecureCounter.sol for the secure version.
contract Counter {
    uint256 public number;

    /// @notice Stores a new value. Anyone can call this function.
    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    /// @notice Adds one to the current value. Anyone can call this function.
    function increment() public {
        number++;
    }
}
