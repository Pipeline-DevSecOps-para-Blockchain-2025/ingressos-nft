## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Add Account

```shell
$ cast wallet import account -i
Enter private key:
```

### Deploy

```shell
$ forge script --rpc-url sepolia --account account --broadcast script/Deploy.s.sol:DeployScript
...
Contract Address: 0x327353E250518cFAF595ed14EdeC108205cC429e
...
$ forge verify-contract --chain sepolia --watch 0x327353E250518cFAF595ed14EdeC108205cC429e src/Ingressos.sol:Ingressos
$ forge verify-bytecode --rpc-url sepolia 0x327353E250518cFAF595ed14EdeC108205cC429e src/Ingressos.sol:Ingressos
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
