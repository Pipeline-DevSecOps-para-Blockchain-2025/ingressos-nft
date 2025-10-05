export const INGRESSOS_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ADMIN_ROLE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ORGANIZER_ROLE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createEvent",
    "inputs": [
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "date", "type": "uint256", "internalType": "uint256" },
      { "name": "venue", "type": "string", "internalType": "string" },
      { "name": "ticketPrice", "type": "uint256", "internalType": "uint256" },
      { "name": "maxSupply", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getEventDetails",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{
      "name": "",
      "type": "tuple",
      "internalType": "struct Ingressos.Event",
      "components": [
        { "name": "name", "type": "string", "internalType": "string" },
        { "name": "description", "type": "string", "internalType": "string" },
        { "name": "date", "type": "uint256", "internalType": "uint256" },
        { "name": "venue", "type": "string", "internalType": "string" },
        { "name": "ticketPrice", "type": "uint256", "internalType": "uint256" },
        { "name": "maxSupply", "type": "uint256", "internalType": "uint256" },
        { "name": "currentSupply", "type": "uint256", "internalType": "uint256" },
        { "name": "organizer", "type": "address", "internalType": "address" },
        { "name": "status", "type": "uint8", "internalType": "enum Ingressos.EventStatus" },
        { "name": "createdAt", "type": "uint256", "internalType": "uint256" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "purchaseTicket",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getTicketInfo",
    "inputs": [{ "name": "tokenId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{
      "name": "",
      "type": "tuple",
      "internalType": "struct Ingressos.TicketInfo",
      "components": [
        { "name": "eventId", "type": "uint256", "internalType": "uint256" },
        { "name": "ticketNumber", "type": "uint256", "internalType": "uint256" },
        { "name": "purchasePrice", "type": "uint256", "internalType": "uint256" },
        { "name": "purchaseDate", "type": "uint256", "internalType": "uint256" },
        { "name": "originalBuyer", "type": "address", "internalType": "address" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      { "name": "role", "type": "bytes32", "internalType": "bytes32" },
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantOrganizerRole",
    "inputs": [{ "name": "account", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeOrganizerRole",
    "inputs": [{ "name": "account", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateEventStatus",
    "inputs": [
      { "name": "eventId", "type": "uint256", "internalType": "uint256" },
      { "name": "newStatus", "type": "uint8", "internalType": "enum Ingressos.EventStatus" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawRevenue",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getWithdrawableAmount",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalRevenue",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextEventId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ownerOf",
    "inputs": [{ "name": "tokenId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenURI",
    "inputs": [{ "name": "tokenId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      { "name": "from", "type": "address", "internalType": "address" },
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "EventCreated",
    "inputs": [
      { "name": "eventId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "name", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "organizer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "ticketPrice", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "maxSupply", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TicketPurchased",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "eventId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "ticketNumber", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EventStatusChanged",
    "inputs": [
      { "name": "eventId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "oldStatus", "type": "uint8", "indexed": false, "internalType": "uint8" },
      { "name": "newStatus", "type": "uint8", "indexed": false, "internalType": "uint8" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RevenueWithdrawn",
    "inputs": [
      { "name": "eventId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "organizer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EventNotFound",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "error",
    "name": "EventSoldOut",
    "inputs": [{ "name": "eventId", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "error",
    "name": "EventNotActive",
    "inputs": [
      { "name": "eventId", "type": "uint256", "internalType": "uint256" },
      { "name": "status", "type": "uint8", "internalType": "uint8" }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientPayment",
    "inputs": [
      { "name": "required", "type": "uint256", "internalType": "uint256" },
      { "name": "provided", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedOrganizer",
    "inputs": [{ "name": "caller", "type": "address", "internalType": "address" }]
  }
] as const;
