let raspberrySocket = null;

function setPiSocket(socket) {
    raspberrySocket = socket;
}

function getPiSocket() {
    return raspberrySocket;
}

function sendToPi(data) {
    if (raspberrySocket && raspberrySocket.readyState === 1) {
        raspberrySocket.send(JSON.stringify(data));
    } else {
        throw new Error("Raspberry Pi not connected");
    }
}

module.exports = { setPiSocket, getPiSocket, sendToPi };
