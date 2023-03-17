# Primal Web Client

This repo holds the web client of the Primal Nostr.

## Setup

- Clone this repo
- run `npm install`
- run `npm run dev` for stand a local instance

## Cache API

All messages have the following structure:

`[$type, $subid, { "cache": [$endpoint, $params] }]`

- `$type`: String specifying the type of the message eg: "REQ", "EVENT", "CLOSE", ...
- `$subid`: String specifying the subscription id. This can be an arbitrary string and is used by the client to identify response to the specific request.
- `$endpoint`: String identifing the endpoint you are sending the message to
- `$params`: Object (key: value) with parameters that the `$endpoint` needs to take into consideration. These are specific to each endpoint.

## Available endpoints

### User profile (`user_info`)

#### Request

Request the meta-data of the user specified by `pubkey` parameter.

Available options are:
- `pubkey`: Hex public key of a user whose meta-data you whish to get.

Example: `["REQ", "some_sub_id", { "cache": ["user_info", { pubkey: "<actual_hex_pubkey>"}] }]`

#### Response

Response is a series of events that correspond to the request:

`["EVENT", "some_sub_id", <event of kind 0>]`

Followed by the `EOSE` message:

`["EOSE", "some_sub_id"]`

### FEED (`feed`)

#### Request

Request a feed of notes, whose authors are followed by a user specified by the `pubkey` parameter. Notes in the feed are sorted by creation time.

Available options are:
- `pubkey`: Hex public key of a user whose feed you whish to get.
- `limit`: Number of notes to be sent as a respose to this request.
- `until`: Timestamp. Notes returned are created before this time.
- `since`: Timestamp. Notes returned are created after this time.

Example: `["REQ", "some_sub_id", { "cache": ["feed", { pubkey: "<actual_hex_pubkey>", "limit": 20, "until": 1234567890}] }]`

#### Response

Response is a series of events of kind `1` (notes), kind `0` (author meta-data) and kind `10000100` (note stats) that correspond to the request:

`["EVENT", "some_sub_id", <event of kind 1>]`
`["EVENT", "some_sub_id", <event of kind 0>]`
`["EVENT", "some_sub_id", <event of kind 10000100>]`

Followed by the `EOSE` message:

`["EOSE", "some_sub_id"]`


### Thread (`thread_vew`)

#### Request

Request a thread of the specific note. It's replies and a note that this note is a reply to (if applicable).

Available options are:
- `event_id`: Hex id of the note whose thread you wish to get.
- `limit`: Number of notes to be sent as a respose to this request.
- `until`: **WIP** Timestamp. Notes returned are created before this time.
- `since`: **WIP** Timestamp. Notes returned are created after this time.

Example: `["REQ", "some_sub_id", { "cache": ["thread_view", { event_id: "<actual_hex_event_id>", "limit": 20 }] }]`

#### Response

Resonse is the similar to the `feed` one.

### Explore (`explore`)

#### Request

Request notes that adhere to criteria of `scope` and `timeframe`.

Supported scopes are:
- `follows`: accounts `you` follow.
- `tribe`: accounts `you` follow + `your` followers.
- `network`: accounts `you` follow + everyone they follow.
- `global`: all of nostr.

Supported timeframes are:
- `trending`: Notes that have the best "score" `since` a certain time.
- `popular`: Notes that have the best "score".
- `latest`: Notes sotred by creation time, newest first.
- `mostzapped`: Notes that have gotten the most sats zapped `since` a certain time.

Notes returned by this endpoint adhere to both the specified `scope` and `timeframe`.

Available options are:
- `pubkey`: Hex public key of a user who is the subject of the request (`you`).
- `limit`: Number of notes to be sent as a respose to this request.
- `until`: **WIP** Timestamp. Notes returned are created before this time.
- `since`: Timestamp. Notes returned are created after this time.
- `scope`: Scope of the request.
- `timeframe`: Timeframe of the request.

Example: `["REQ", "some_sub_id", { "cache": ["feed", { pubkey: "<actual_hex_pubkey>", "limit": 20, "scope": "follows", "timeframe": "trending"}] }]`

#### Response

Response is similar to the `feed` one.

### Stats (`net_stats`)

#### Request

Request a stream of statistics provided by the cache server.

Example: `["REQ", "some_sub_id", { "cache": ["net_stats"]}]`

To stop the stream send a `CLOSE` message with the same `$subid`

Example: `["CLOSE", "some_sub_id"]`

#### Response

Response is a series of kind `10000101` events, util closed:

`["EVENT", "some_sub_id", <event of kind 10000101>]`
