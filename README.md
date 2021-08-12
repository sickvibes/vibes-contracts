# vibes-contracts

Solidity smart contracts for the VIBES project

## Development

Compile and build all contracts:

```
npm run build
```

Cleanup build artifacts and dev blockchain db:

```
npm run clean
```

## Testing

Currently some tests will intermittently fail because they rely on time-based view functions, if the test is running a bit slow oftentimes some of the asserts will be slightly off.

It helps to run less tests I've noticed (using `.only` or similar). There's likely a better way to handle this.

Some tests for older contracts from the BVAL project repos have been omitted.

Start local blockchain:

```
npm run blockchain:local
```

Run unit tests:

```
npm test
```

## Verifying Contracts

The following env vars must be set (`.env` in this directory will be sourced if present):

* `POLYGONSCAN_API_KEY` - Polygonscan API key - https://polygonscan.com/apis

Verify NFT contract on Polygonscan:

```
npx truffle --network polygon run verify $CONTRACT_NAME@$CONTRACT_ADDRESS
```



