// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ingressos} from "../src/Ingressos.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy the Ingressos contract
        Ingressos ingressos = new Ingressos();

        console.log("Ingressos contract deployed to:", address(ingressos));
        console.log("Deployer address:", msg.sender);

        // Grant organizer role to deployer for testing
        ingressos.grantOrganizerRole(msg.sender);
        console.log("Granted ORGANIZER_ROLE to deployer");

        vm.stopBroadcast();
    }
}
