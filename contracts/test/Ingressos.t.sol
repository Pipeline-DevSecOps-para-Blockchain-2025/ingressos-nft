// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";

import { Ingressos } from "../src/Ingressos.sol";

contract IngressosTest is Test {
    Ingressos public ingressos;

    address private constant ADMIN = 0x0A3bF3197EF42b596460C6678983A7ef62cf5207;
    address private constant ORGANIZER = 0x1B4Cf3298eF52C596460C6678983a7eF62cF5208;
    address private constant USER = 0x2c5df4399ef63D596460c6678983A7Ef62CF5209;

    function setUp() public {
        vm.prank(ADMIN);
        ingressos = new Ingressos();
    }

    // Basic functionality tests
    function test_organizerCanCreateEvent() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        assertEq(eventId, 1);
        Ingressos.Event memory eventData = ingressos.getEventDetails(eventId);
        assertEq(eventData.name, "Test Concert");
        assertEq(eventData.organizer, ORGANIZER);
    }

    function test_userCanPurchaseTicket() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        assertEq(tokenId, 1);
        assertEq(ingressos.ownerOf(tokenId), USER);
    }

    // Transfer functionality tests
    function test_ticketCanBeTransferred() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        address newOwner = address(0x789);
        vm.prank(USER);
        ingressos.transferFrom(USER, newOwner, tokenId);

        assertEq(ingressos.ownerOf(tokenId), newOwner);
    }

    function test_ticketMetadataPersistsAfterTransfer() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        Ingressos.TicketInfo memory originalInfo = ingressos.getTicketInfo(tokenId);

        address newOwner = address(0x789);
        vm.prank(USER);
        ingressos.transferFrom(USER, newOwner, tokenId);

        Ingressos.TicketInfo memory newInfo = ingressos.getTicketInfo(tokenId);
        assertEq(originalInfo.eventId, newInfo.eventId);
        assertEq(originalInfo.ticketNumber, newInfo.ticketNumber);
        assertEq(originalInfo.originalBuyer, newInfo.originalBuyer);
    }

    function test_multipleTransfersPreserveMetadata() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        Ingressos.TicketInfo memory originalInfo = ingressos.getTicketInfo(tokenId);

        address owner2 = address(0x789);
        address owner3 = address(0xabc);

        vm.prank(USER);
        ingressos.transferFrom(USER, owner2, tokenId);

        vm.prank(owner2);
        ingressos.transferFrom(owner2, owner3, tokenId);

        assertEq(ingressos.ownerOf(tokenId), owner3);

        Ingressos.TicketInfo memory finalInfo = ingressos.getTicketInfo(tokenId);
        assertEq(originalInfo.originalBuyer, finalInfo.originalBuyer);
        assertEq(originalInfo.eventId, finalInfo.eventId);
        assertEq(originalInfo.ticketNumber, finalInfo.ticketNumber);
    }

    function test_isTicketValidForActiveEvent() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        assertTrue(ingressos.isTicketValid(tokenId));
    }

    function test_isTicketValidForCancelledEvent() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        vm.prank(ORGANIZER);
        ingressos.cancelEvent(eventId);

        assertFalse(ingressos.isTicketValid(tokenId));
    }

    function test_getTicketOwnershipHistory() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        (address originalBuyer, address currentOwner) = ingressos.getTicketOwnershipHistory(tokenId);
        assertEq(originalBuyer, USER);
        assertEq(currentOwner, USER);

        address newOwner = address(0x789);
        vm.prank(USER);
        ingressos.transferFrom(USER, newOwner, tokenId);

        (originalBuyer, currentOwner) = ingressos.getTicketOwnershipHistory(tokenId);
        assertEq(originalBuyer, USER);
        assertEq(currentOwner, newOwner);
    }

    function test_verifyTicketAuthenticity() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        (
            bool isAuthentic,
            uint256 returnedEventId,
            uint256 ticketNumber,
            address originalBuyer,
            uint256 purchasePrice,
            uint256 purchaseDate
        ) = ingressos.verifyTicketAuthenticity(tokenId);

        assertTrue(isAuthentic);
        assertEq(returnedEventId, eventId);
        assertEq(ticketNumber, 1);
        assertEq(originalBuyer, USER);
        assertEq(purchasePrice, 0.1 ether);
        assertEq(purchaseDate, block.timestamp);
    }

    function test_ticketValidityAfterMultipleTransfers() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        address owner2 = address(0x789);
        address owner3 = address(0xabc);

        vm.prank(USER);
        ingressos.transferFrom(USER, owner2, tokenId);

        vm.prank(owner2);
        ingressos.transferFrom(owner2, owner3, tokenId);

        assertTrue(ingressos.isTicketValid(tokenId));

        (bool isAuthentic,,,,,) = ingressos.verifyTicketAuthenticity(tokenId);
        assertTrue(isAuthentic);
    }

    function test_erc721StandardFunctionsWork() public {
        vm.prank(ADMIN);
        ingressos.grantOrganizerRole(ORGANIZER);

        vm.prank(ORGANIZER);
        uint256 eventId = ingressos.createEvent(
            "Test Concert", "A great concert", block.timestamp + 1 days, "Test Venue", 0.1 ether, 100
        );

        vm.deal(USER, 1 ether);
        vm.prank(USER);
        uint256 tokenId = ingressos.purchaseTicket{ value: 0.1 ether }(eventId);

        assertEq(ingressos.balanceOf(USER), 1);
        assertEq(ingressos.ownerOf(tokenId), USER);

        address approved = address(0x789);
        vm.prank(USER);
        ingressos.approve(approved, tokenId);
        assertEq(ingressos.getApproved(tokenId), approved);

        address newOwner = address(0xabc);
        vm.prank(approved);
        ingressos.transferFrom(USER, newOwner, tokenId);
        assertEq(ingressos.ownerOf(tokenId), newOwner);
        assertEq(ingressos.balanceOf(USER), 0);
        assertEq(ingressos.balanceOf(newOwner), 1);
    }
}
