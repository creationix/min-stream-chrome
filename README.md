This repo is min-stream bindings for chrome packaged apps.

It should have the same interface as the node.js version where possible.

```js
// Creating a TCP echo server on localhost.
tcp.createServer("127.0.0.1", 8080, function (client) {
  console.log("New client", client);
  client.sink(client.source);
});
console.log("TCP echo server listening at localhost 8080");
```

See js-git for more examples.
