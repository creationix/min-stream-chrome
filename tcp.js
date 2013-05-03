exports.createServer = createServer;
function createServer(address, port, callback) {
  chrome.socket.create("tcp", function (info) {
    var serverId = info.socketId;
    chrome.socket.listen(serverId, address, port, 511, function (result) {
      if (result) { throw new Error("TODO: handle result"); }
      getNext();
      function getNext() {
        chrome.socket.accept(serverId, function (info) {
          if (info.resultCode) { throw new Error("TODO: handle resultCode"); }
          callback(null, wrapSocket(info.socketId));
          getNext();
        });
      }
    });
  });
}

exports.connect = connect;
function connect(address, port, callback) {
  chrome.socket.create("tcp", function (info) {
    chrome.socket.connect(info.socketId, address, port, function (result) {
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
      chrome.socket.disconnect(id);
      chrome.socket.destroy(id);
      return callback();
    }
    chrome.socket.read(id, function (info) {
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
        socket.disconnect(id);
        socket.destroy(id);
        return read(err, noop);
      }
      if (typeof chunk === "string") {
        stringToBuffer(chunk, function (buffer) {
          chrome.socket.write(id, buffer, onWrite);
        });
      }
      else {
        chrome.socket.write(id, chunk, onWrite);
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

