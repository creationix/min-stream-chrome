var socket = chrome.socket;

exports.createServer = createServer;
// Returns a source that emits requests.
function createServer(address, port, callback) {
  socket.create("tcp", function (info) {
    socket.listen(info.socketId, address, port, 511, function (result) {
      if (result < 0) {
        return callback(new Error("Error code " + result + " while listening to " + address + ":" + port));
      }
      return callback(null, wrapServer(info.socketId));
    });
  });
}

function wrapServer(id) {
  return {
    source: read,
    socketId: id,
  };
  function read(close, callback) {
    if (close) {
      throw new Error("TODO: Implement server closing");
    }
    socket.accept(id, function (info) {
      if (info.resultCode < 0) {
        return callback(new Error("Error code " + info.resultCode + " while accepting connection"));
      }
      callback(null, wrapSocket(info.socketId));
    });
  };
}

exports.connect = connect;
function connect(address, port, callback) {
  socket.create("tcp", function (info) {
    socket.connect(info.socketId, address, port, function (result) {
      if (result < 0) {
        return callback(new Error("Error code " + result + " while connecting to " + address + ":" + port));
      }
      callback(null, wrapSocket(info.socketId));
    });
  });
}

exports.wrapSocket = wrapSocket;
function wrapSocket(id) {
  return {
    source: socketToSource(id),
    sink: socketToSink(id),
    socketId: id
  };
}

exports.socketToSource = socketToSource;
function socketToSource(id) {
  return function (close, callback) {
    if (close) {
      try { socket.disconnect(id); } catch (err ) {}
      try { socket.destroy(id); } catch (err ) {}
      return callback();
    }
    socket.read(id, function (info) {
      if (info.resultCode < 0) {
        return callback(new Error("Error code " + info.resultCode + " while reading from socket " + id));
      }
      callback(null, info.data);
    });
  };
}

function noop() {}

exports.socketToSink = socketToSink;
function socketToSink(id) {
  return function (read) {
    read(null, onRead);
    function onRead(err, chunk) {
      if (chunk === undefined) {
        try { socket.disconnect(id); } catch (err ) {}
        try { socket.destroy(id); } catch (err ) {}
        return read(err, noop);
      }
      if (typeof chunk === "string") {
        stringToBuffer(chunk, function (buffer) {
          socket.write(id, buffer, onWrite);
        });
      }
      else {
        socket.write(id, chunk, onWrite);
      }
    }
    function onWrite(info) {
      if (info.bytesWritten < 0) {
        return read(new Error("Error code " + info.bytesWritten + " while writing to socket " + id), noop);
      }
      read(null, onRead);
    }
  };
}

function stringToBuffer(string, callback) {
  var reader = new FileReader();
  reader.onload = function (evt) {
    callback(evt.target.result);
  };
  reader.readAsArrayBuffer(new Blob([string]));
}

