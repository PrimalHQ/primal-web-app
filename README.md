### Primal Web Client

This repo holds the web client of the Primal Nostr.

## Setup

- Clone this repo
- run `npm install`
- run `npm run dev` for stand a local instance

## Web sockets

Application comunicates with the cache server using the following messages.

#User feed

Client request : `["REQ", $subid, { primal: ["user_feed", {"pubkey": $pubkey }]}]`

- `$subid` is the id of subscription, currently a random number will do
- `$pubkey` public key (hex version) of the user whose feed you wish to see.

Server should respond with:
```JSON
{
    "op": "multi_add",
    "event": [
      {
        "op": "add",
        "event": {
          "id": "id hash",
          "pubkey": "pubkey hash",
          "created_at": 1234567,
          "kind": 1,
          "tags": [
            [
              "p",
              "tag hash"
            ]
          ],
          "content": "Message text",
          "sig": "signiture hash"
        },
        "stats": {
          "likes": 0,
          "replies": 0,
          "mentions": 0
        }
      },
      ...
    ],
    "meta_data": [
      {
          "op": "add",
          "pubkey": "pubkey hash that can be paired with a hash from event",
          "meta_data": {
              "kind": 0,
              "pubkey": "pubkey hash",
              "id": "id hash",
              "sig": "sig hash",
              "created_at": 1234567,
              "content": "User profile JSON object",
              "tags": []
          }
      },
      ...
    ]
}
```

- `event` items correspond with user posts (kind 1)
- `meta_data` items correspond with user profiles (kind 0). These are the users whose `pubkey` appears in the `event` list.

#Netstats

Clent request: `[ "REQ", $subid, { "primal": [ "net_stats" ] }];

- `$subid` same as before, a random number will do.

Server response:
```JSON
{
  "op": "set",
  "netstats": {
    "pubkeys": 3809810,
    "pubnotes": 1903141,
    "reactions": 978939,
    "allevents": 3752485
  }
}
```

These are statistics of the cached data (number of public keys, notes, reactions and all events in total).
