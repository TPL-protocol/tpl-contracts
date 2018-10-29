# setup
```
yarn install
yarn build
yarn deploy
yarn tx
```

# basic attribute addition
```
yarn tx addAttributeType 777 'Totally Phenomenal Lad/Lass'
yarn tx addValidator 1 'TPL validator'
yarn tx addValidatorApproval 1 777
yarn tx hasAttribute 2 777
yarn tx issueAttribute 2 777 0 -1
yarn tx hasAttribute 2 777
yarn tx getAttributeValue 2 777
yarn tx issueAttribute 2 777 0 -1
yarn tx hasAttribute 2 777
yarn tx getAttributeValue 2 777
```

# DrinkToken
```
yarn deploy DrinkToken
yarn tx fermint
yarn tx getValidAttributeID20
yarn tx addAttributeType 11111 'Over 21'
yarn tx addValidator 3 'ID checker'
yarn tx addValidatorApproval 3 11111
yarn tx issueAttribute 0 11111 0 -3
yarn tx fermint
yarn tx transfer 1 1
yarn tx issueAttribute 1 11111 0 -3
yarn tx transfer 1 1
yarn tx liquidate -1
```

# CryptoCopycats
```
yarn deploy CryptoCopycats
yarn tx tokenOfOwnerByIndex 0 0
(new tab copycats) REACT_APP_DNA=<tokenId> yarn start
yarn transferFrom 0 1 <tokenId>
yarn deploy CCC
yarn tx getValidAttributeID721
yarn tx addAttributeType 22222 'Responsible pet owner'
yarn tx showAccounts
yarn tx addValidator c89f26cab710198682a8659f5f2f6749eA2fa914 'Validator Contract'
yarn tx addValidatorApproval c89f26cab710198682a8659f5f2f6749eA2fa914 22222
yarn tx issueCCAttribute true true false
yarn tx issueCCAttribute true true false -1
yarn tx transferFrom 0 1 <tokenId>
yarn tx revokeCCAttribute 1
yarn tx rescue <tokenId>
```

# Check out the contracts on mainnet:
  Jurisdiction: devcon4.tplprotocol.eth
  
  DrinkToken: drinktoken.devcon4.tplprotocol.eth
  
  CryptoCopycats: cryptocopycats.devcon4.tplprotocol.eth
  
  CCC (validator): ccc.devcon4.tplprotocol.eth
