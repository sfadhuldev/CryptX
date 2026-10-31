// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SecureCounter
/// @notice A beginner-friendly counter with an owner, an input limit, and events.
/// @dev This contract is for LOCAL learning only. It has not been audited.
contract SecureCounter {
    // The largest value the counter is allowed to store.
    // `constant` means the value is fixed at compile time and cannot be changed.
    uint256 public constant MAX_VALUE = 100;

    // The current counter value. It starts at zero when the contract is deployed.
    uint256 public number = 0;

    // The address allowed to change the number.
    // It is set once in the constructor and can be read by the frontend.
    address public owner;

    // Events are cheap logs stored on the blockchain. The frontend reads them
    // to show a history of successful changes.
    // `indexed` lets applications filter logs by the address that made the change.
    event NumberChanged(address indexed changedBy, uint256 oldValue, uint256 newValue);

    // A modifier wraps a function with a reusable security check.
    // Every function marked `onlyOwner` runs this require before its own code.
    modifier onlyOwner() {
        // msg.sender is the address that called the function.
        require(msg.sender == owner, "Not owner: access denied");
        // The underscore continues with the body of the protected function.
        _;
    }

    // The constructor runs exactly once, when the contract is deployed.
    constructor() {
        // The account that deploys the contract becomes its first owner.
        owner = msg.sender;
    }

    /// @notice Increases the number by one. Only the owner may call this.
    function increment() external onlyOwner {
        // Stop before the number becomes larger than MAX_VALUE.
        require(number < MAX_VALUE, "Limit reached: number cannot exceed 100");

        // Save the old value so the event can show the complete change.
        uint256 oldValue = number;

        // Increase the stored number by one.
        number = oldValue + 1;

        // Record the successful change on the blockchain.
        emit NumberChanged(msg.sender, oldValue, number);
    }

    /// @notice Sets the number to a new value. Only the owner may call this.
    /// @param newNumber The new value, which must be 100 or less.
    function setNumber(uint256 newNumber) external onlyOwner {
        // Reject invalid input instead of silently storing a bad value.
        require(newNumber <= MAX_VALUE, "Invalid number: must be 100 or less");

        // Save the old value so the event can show the complete change.
        uint256 oldValue = number;

        // Store the validated new value.
        number = newNumber;

        // Record the successful change on the blockchain.
        emit NumberChanged(msg.sender, oldValue, newNumber);
    }
}
