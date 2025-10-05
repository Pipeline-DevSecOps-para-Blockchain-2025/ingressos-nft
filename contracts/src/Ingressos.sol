// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Ingressos is ERC721, AccessControl {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    // Enums
    enum EventStatus {
        Active,
        Paused,
        Cancelled,
        Completed
    }

    // Structs
    struct Event {
        string name;
        string description;
        uint256 date;
        string venue;
        uint256 ticketPrice;
        uint256 maxSupply;
        uint256 currentSupply;
        address organizer;
        EventStatus status;
        uint256 createdAt;
    }

    struct TicketInfo {
        uint256 eventId;
        uint256 ticketNumber;
        uint256 purchasePrice;
        uint256 purchaseDate;
        address originalBuyer;
    }

    // State variables
    uint256 public nextEventId = 1;
    uint256 public nextTokenId = 1;

    // Mappings
    mapping(uint256 => Event) public events;
    mapping(uint256 => TicketInfo) public tickets;
    mapping(uint256 => uint256) public eventRevenue;
    mapping(uint256 => uint256) public eventWithdrawnRevenue;
    mapping(address => uint256[]) public organizerEvents;
    mapping(uint256 => uint256[]) public eventTickets;

    // Custom errors
    error InsufficientPayment(uint256 required, uint256 provided);
    error EventSoldOut(uint256 eventId);
    error EventNotActive(uint256 eventId, uint8 status);
    error UnauthorizedOrganizer(address caller);
    error EventNotFound(uint256 eventId);
    error NoFundsToWithdraw(uint256 eventId);
    error RefundFailed(address recipient, uint256 amount);

    // Events
    event EventCreated(
        uint256 indexed eventId,
        string name,
        address indexed organizer,
        uint256 ticketPrice,
        uint256 maxSupply
    );

    event TicketPurchased(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed buyer,
        uint256 ticketNumber,
        uint256 price
    );

    event RevenueWithdrawn(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 amount
    );

    event EventStatusChanged(
        uint256 indexed eventId,
        uint8 oldStatus,
        uint8 newStatus
    );

    // Modifiers
    modifier onlyOrganizer() {
        if (!hasRole(ORGANIZER_ROLE, msg.sender)) {
            revert UnauthorizedOrganizer(msg.sender);
        }
        _;
    }

    constructor() ERC721("Ingressos", "ING") {
        // Grant the deployer the default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Access control functions
    function grantOrganizerRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(ORGANIZER_ROLE, account);
    }

    function revokeOrganizerRole(
        address account
    ) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ORGANIZER_ROLE, account);
    }

    // Event management functions
    function createEvent(
        string memory name,
        string memory description,
        uint256 date,
        string memory venue,
        uint256 ticketPrice,
        uint256 maxSupply
    ) external onlyOrganizer returns (uint256) {
        // Input validation
        require(bytes(name).length > 0, "Event name cannot be empty");
        require(bytes(venue).length > 0, "Event venue cannot be empty");
        require(date > block.timestamp, "Event date must be in the future");
        require(maxSupply > 0, "Max supply must be greater than 0");

        uint256 eventId = nextEventId++;

        events[eventId] = Event({
            name: name,
            description: description,
            date: date,
            venue: venue,
            ticketPrice: ticketPrice,
            maxSupply: maxSupply,
            currentSupply: 0,
            organizer: msg.sender,
            status: EventStatus.Active,
            createdAt: block.timestamp
        });

        // Add event to organizer's event list
        organizerEvents[msg.sender].push(eventId);

        emit EventCreated(eventId, name, msg.sender, ticketPrice, maxSupply);

        return eventId;
    }

    function getEventDetails(
        uint256 eventId
    ) external view returns (Event memory) {
        if (events[eventId].createdAt == 0) {
            revert EventNotFound(eventId);
        }
        return events[eventId];
    }

    function updateEventStatus(
        uint256 eventId,
        EventStatus newStatus
    ) external {
        Event storage eventData = events[eventId];

        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Only the event organizer or admin can update status
        require(
            eventData.organizer == msg.sender ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to update event status"
        );

        EventStatus oldStatus = eventData.status;
        eventData.status = newStatus;

        emit EventStatusChanged(eventId, uint8(oldStatus), uint8(newStatus));
    }

    // Ticket purchasing system
    function purchaseTicket(
        uint256 eventId
    ) external payable returns (uint256) {
        Event storage eventData = events[eventId];

        // Check if event exists
        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Check if event is active
        if (eventData.status != EventStatus.Active) {
            revert EventNotActive(eventId, uint8(eventData.status));
        }

        // Check if tickets are still available
        if (eventData.currentSupply >= eventData.maxSupply) {
            revert EventSoldOut(eventId);
        }

        // Check if payment is sufficient
        if (msg.value < eventData.ticketPrice) {
            revert InsufficientPayment(eventData.ticketPrice, msg.value);
        }

        // Generate token ID and ticket number
        uint256 tokenId = nextTokenId++;
        uint256 ticketNumber = eventData.currentSupply + 1;

        // Update event supply
        eventData.currentSupply++;

        // Track revenue
        eventRevenue[eventId] += eventData.ticketPrice;

        // Store ticket information
        tickets[tokenId] = TicketInfo({
            eventId: eventId,
            ticketNumber: ticketNumber,
            purchasePrice: eventData.ticketPrice,
            purchaseDate: block.timestamp,
            originalBuyer: msg.sender
        });

        // Add ticket to event's ticket list
        eventTickets[eventId].push(tokenId);

        // Mint the NFT
        _mint(msg.sender, tokenId);

        // Refund excess payment if any
        if (msg.value > eventData.ticketPrice) {
            uint256 refund = msg.value - eventData.ticketPrice;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) {
                revert RefundFailed(msg.sender, refund);
            }
        }

        emit TicketPurchased(
            tokenId,
            eventId,
            msg.sender,
            ticketNumber,
            eventData.ticketPrice
        );

        return tokenId;
    }

    // Ticket metadata and information system
    function getTicketInfo(
        uint256 tokenId
    ) external view returns (TicketInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tickets[tokenId];
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        TicketInfo memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];

        // Create JSON metadata
        return
            string(
                abi.encodePacked(
                    '{"name":"',
                    eventData.name,
                    " - Ticket #",
                    _toString(ticket.ticketNumber),
                    '","description":"',
                    eventData.description,
                    '","image":"data:image/svg+xml;base64,',
                    _generateTicketSVG(tokenId),
                    '","attributes":[',
                    '{"trait_type":"Event","value":"',
                    eventData.name,
                    '"},',
                    '{"trait_type":"Venue","value":"',
                    eventData.venue,
                    '"},',
                    '{"trait_type":"Ticket Number","value":"',
                    _toString(ticket.ticketNumber),
                    '"},',
                    '{"trait_type":"Purchase Price","value":"',
                    _toString(ticket.purchasePrice),
                    '"},',
                    '{"trait_type":"Event Date","value":"',
                    _toString(eventData.date),
                    '"},',
                    '{"trait_type":"Purchase Date","value":"',
                    _toString(ticket.purchaseDate),
                    '"},',
                    '{"trait_type":"Original Buyer","value":"',
                    _toHexString(ticket.originalBuyer),
                    '"},',
                    '{"trait_type":"Event Status","value":"',
                    _getStatusString(eventData.status),
                    '"}',
                    "]}"
                )
            );
    }

    // Helper functions for metadata generation
    function _generateTicketSVG(
        uint256 tokenId
    ) internal view returns (string memory) {
        TicketInfo memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];

        // Simple SVG ticket design
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
                '<rect width="400" height="200" fill="#f0f0f0" stroke="#333" stroke-width="2"/>',
                '<text x="20" y="30" font-family="Arial" font-size="18" font-weight="bold" fill="#333">',
                eventData.name,
                "</text>",
                '<text x="20" y="60" font-family="Arial" font-size="14" fill="#666">',
                eventData.venue,
                "</text>",
                '<text x="20" y="90" font-family="Arial" font-size="12" fill="#666">Ticket #',
                _toString(ticket.ticketNumber),
                "</text>",
                '<text x="20" y="120" font-family="Arial" font-size="12" fill="#666">Token ID: ',
                _toString(tokenId),
                "</text>",
                '<text x="20" y="150" font-family="Arial" font-size="10" fill="#999">',
                _toHexString(ticket.originalBuyer),
                "</text>",
                "</svg>"
            )
        );

        return _base64Encode(bytes(svg));
    }

    function _getStatusString(
        EventStatus status
    ) internal pure returns (string memory) {
        if (status == EventStatus.Active) return "Active";
        if (status == EventStatus.Paused) return "Paused";
        if (status == EventStatus.Cancelled) return "Cancelled";
        if (status == EventStatus.Completed) return "Completed";
        return "Unknown";
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            buffer[2 + i * 2] = _hexChar(uint8(bytes20(addr)[i]) / 16);
            buffer[3 + i * 2] = _hexChar(uint8(bytes20(addr)[i]) % 16);
        }
        return string(buffer);
    }

    function _hexChar(uint8 value) internal pure returns (bytes1) {
        if (value < 10) {
            return bytes1(uint8(48 + value));
        }
        return bytes1(uint8(87 + value));
    }

    function _base64Encode(
        bytes memory data
    ) internal pure returns (string memory) {
        if (data.length == 0) return "";

        string
            memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let i := 0
            } lt(i, mload(data)) {
                i := add(i, 3)
            } {
                let input := and(mload(add(data, add(i, 32))), 0xffffff)

                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(
                    out,
                    and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF)
                )
                out := shl(8, out)
                out := add(
                    out,
                    and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF)
                )
                out := shl(8, out)
                out := add(
                    out,
                    and(mload(add(tablePtr, and(input, 0x3F))), 0xFF)
                )
                out := shl(224, out)

                mstore(resultPtr, out)

                resultPtr := add(resultPtr, 4)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }

            mstore(result, encodedLen)
        }

        return result;
    }

    // Revenue management system
    function withdrawRevenue(uint256 eventId) external {
        Event storage eventData = events[eventId];

        // Check if event exists
        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Only the event organizer can withdraw revenue
        require(
            eventData.organizer == msg.sender,
            "Only event organizer can withdraw revenue"
        );

        uint256 withdrawableAmount = getWithdrawableAmount(eventId);

        if (withdrawableAmount == 0) {
            revert NoFundsToWithdraw(eventId);
        }

        // Update withdrawn revenue tracking
        eventWithdrawnRevenue[eventId] += withdrawableAmount;

        // Transfer funds to organizer
        (bool success, ) = payable(msg.sender).call{value: withdrawableAmount}(
            ""
        );
        if (!success) {
            revert RefundFailed(msg.sender, withdrawableAmount);
        }

        emit RevenueWithdrawn(eventId, msg.sender, withdrawableAmount);
    }

    function getWithdrawableAmount(
        uint256 eventId
    ) public view returns (uint256) {
        if (events[eventId].createdAt == 0) {
            revert EventNotFound(eventId);
        }

        uint256 totalRevenue = eventRevenue[eventId];
        uint256 alreadyWithdrawn = eventWithdrawnRevenue[eventId];

        return totalRevenue - alreadyWithdrawn;
    }

    function getTotalRevenue(uint256 eventId) external view returns (uint256) {
        if (events[eventId].createdAt == 0) {
            revert EventNotFound(eventId);
        }
        return eventRevenue[eventId];
    }

    function getWithdrawnRevenue(
        uint256 eventId
    ) external view returns (uint256) {
        if (events[eventId].createdAt == 0) {
            revert EventNotFound(eventId);
        }
        return eventWithdrawnRevenue[eventId];
    }

    // Event status management and refund system
    function pauseEvent(uint256 eventId) external {
        Event storage eventData = events[eventId];

        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Only the event organizer or admin can pause events
        require(
            eventData.organizer == msg.sender ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to pause event"
        );

        require(
            eventData.status == EventStatus.Active,
            "Event must be active to pause"
        );

        EventStatus oldStatus = eventData.status;
        eventData.status = EventStatus.Paused;

        emit EventStatusChanged(
            eventId,
            uint8(oldStatus),
            uint8(EventStatus.Paused)
        );
    }

    function resumeEvent(uint256 eventId) external {
        Event storage eventData = events[eventId];

        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Only the event organizer or admin can resume events
        require(
            eventData.organizer == msg.sender ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to resume event"
        );

        require(
            eventData.status == EventStatus.Paused,
            "Event must be paused to resume"
        );

        EventStatus oldStatus = eventData.status;
        eventData.status = EventStatus.Active;

        emit EventStatusChanged(
            eventId,
            uint8(oldStatus),
            uint8(EventStatus.Active)
        );
    }

    function cancelEvent(uint256 eventId) external {
        Event storage eventData = events[eventId];

        if (eventData.createdAt == 0) {
            revert EventNotFound(eventId);
        }

        // Only the event organizer or admin can cancel events
        require(
            eventData.organizer == msg.sender ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to cancel event"
        );

        require(
            eventData.status == EventStatus.Active ||
                eventData.status == EventStatus.Paused,
            "Event must be active or paused to cancel"
        );

        EventStatus oldStatus = eventData.status;
        eventData.status = EventStatus.Cancelled;

        emit EventStatusChanged(
            eventId,
            uint8(oldStatus),
            uint8(EventStatus.Cancelled)
        );

        // Process refunds for all ticket holders
        _processEventRefunds(eventId);
    }

    function _processEventRefunds(uint256 eventId) internal {
        uint256[] memory ticketIds = eventTickets[eventId];

        for (uint256 i = 0; i < ticketIds.length; i++) {
            uint256 tokenId = ticketIds[i];
            TicketInfo memory ticket = tickets[tokenId];
            address ticketOwner = _ownerOf(tokenId);

            // Only refund if ticket still exists and has an owner
            if (ticketOwner != address(0)) {
                uint256 refundAmount = ticket.purchasePrice;

                // Transfer refund to current ticket owner
                (bool success, ) = payable(ticketOwner).call{
                    value: refundAmount
                }("");
                if (!success) {
                    revert RefundFailed(ticketOwner, refundAmount);
                }

                // Reduce event revenue by refund amount
                if (eventRevenue[eventId] >= refundAmount) {
                    eventRevenue[eventId] -= refundAmount;
                }
            }
        }
    }

    function getRefundAmount(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        TicketInfo memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];

        // Only cancelled events are eligible for refunds
        if (eventData.status == EventStatus.Cancelled) {
            return ticket.purchasePrice;
        }

        return 0;
    }

    // Transfer functionality and secondary market support
    function isTicketValid(uint256 tokenId) external view returns (bool) {
        // Check if token exists
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }

        TicketInfo memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];

        // Ticket is valid if event exists and is not cancelled
        return eventData.createdAt != 0 && eventData.status != EventStatus.Cancelled;
    }

    function getTicketOwnershipHistory(uint256 tokenId) external view returns (address originalBuyer, address currentOwner) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TicketInfo memory ticket = tickets[tokenId];
        return (ticket.originalBuyer, _ownerOf(tokenId));
    }

    function getTicketTransferCount(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TicketInfo memory ticket = tickets[tokenId];
        address currentOwner = _ownerOf(tokenId);
        
        // If current owner is the original buyer, no transfers have occurred
        if (currentOwner == ticket.originalBuyer) {
            return 0;
        }
        
        // For simplicity, we return 1 if transferred (could be enhanced to track exact count)
        return 1;
    }

    function verifyTicketAuthenticity(uint256 tokenId) external view returns (
        bool isAuthentic,
        uint256 eventId,
        uint256 ticketNumber,
        address originalBuyer,
        uint256 purchasePrice,
        uint256 purchaseDate
    ) {
        if (_ownerOf(tokenId) == address(0)) {
            return (false, 0, 0, address(0), 0, 0);
        }

        TicketInfo memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];

        // Ticket is authentic if it exists and event exists
        bool authentic = eventData.createdAt != 0;

        return (
            authentic,
            ticket.eventId,
            ticket.ticketNumber,
            ticket.originalBuyer,
            ticket.purchasePrice,
            ticket.purchaseDate
        );
    }

    // Required override for AccessControl
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
