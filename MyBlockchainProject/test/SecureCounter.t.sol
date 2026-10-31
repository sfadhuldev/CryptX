// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { SecureCounter } from "../src/SecureCounter.sol";

contract SecureCounterTest is Test {
    SecureCounter private counter;

    // The test contract deploys SecureCounter, so it becomes the owner.
    address private owner;
    address private attacker = makeAddr("attacker");

    function setUp() public {
        counter = new SecureCounter();
        owner = address(this);
    }

    /// 1. The number starts at zero and the deployer is the owner.
    function test_InitialNumberIsZero() public view {
        assertEq(counter.number(), 0);
        assertEq(counter.owner(), owner);
        assertEq(counter.MAX_VALUE(), 100);
    }

    /// 2. The owner can increase the number.
    function test_OwnerCanIncrement() public {
        vm.expectEmit(true, false, false, true, address(counter));
        emit SecureCounter.NumberChanged(owner, 0, 1);

        counter.increment();

        assertEq(counter.number(), 1);
    }

    /// 3. The owner can set a new valid number and the event is recorded.
    function test_OwnerCanSetNumber() public {
        vm.expectEmit(true, false, false, true, address(counter));
        emit SecureCounter.NumberChanged(owner, 0, 42);

        counter.setNumber(42);

        assertEq(counter.number(), 42);
    }

    /// 4a. An unauthorized account cannot increment the number.
    function test_UnauthorizedCannotIncrement() public {
        vm.prank(attacker);
        vm.expectRevert(bytes("Not owner: access denied"));
        counter.increment();

        assertEq(counter.number(), 0);
    }

    /// 4b. An unauthorized account cannot set a new number.
    function test_UnauthorizedCannotSetNumber() public {
        vm.prank(attacker);
        vm.expectRevert(bytes("Not owner: access denied"));
        counter.setNumber(50);

        assertEq(counter.number(), 0);
    }

    /// 5. Values greater than 100 are rejected, including on the boundary.
    function test_RevertWhen_SetNumberAboveLimit() public {
        vm.expectRevert(bytes("Invalid number: must be 100 or less"));
        counter.setNumber(101);

        assertEq(counter.number(), 0);
    }

    /// 6. The counter cannot increase beyond its maximum value.
    function test_RevertWhen_IncrementBeyondLimit() public {
        counter.setNumber(counter.MAX_VALUE());
        assertEq(counter.number(), 100);

        vm.expectRevert(bytes("Limit reached: number cannot exceed 100"));
        counter.increment();

        assertEq(counter.number(), 100);
    }

    /// A valid boundary value of exactly 100 is accepted.
    function test_OwnerCanSetMaximumValue() public {
        counter.setNumber(counter.MAX_VALUE());
        assertEq(counter.number(), 100);
    }

    /// Fuzz test: every value in the allowed range must be stored correctly.
    function testFuzz_OwnerCanSetValidNumber(uint256 newNumber) public {
        newNumber = bound(newNumber, 0, counter.MAX_VALUE());

        counter.setNumber(newNumber);

        assertEq(counter.number(), newNumber);
    }
}
