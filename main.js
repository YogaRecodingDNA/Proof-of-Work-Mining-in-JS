'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

var http_port = process.env.HTTP_PORT || 3001;

// Web sockets used for real-time peer-to-peer communication between the nodes.
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];


var sockets = [];
// Sockets to expect the following messages types
var MessageType = {
    QUERY_LATEST: 0, // Query for the last block
    QUERY_ALL: 1, // Query for all the blocks
    RESPONSE_BLOCKCHAIN: 2 // Response message with the requested data (last block or all the blocks)
// {{{{ MESSAGING CODE }}}} *refer to bottom of page
};

class Block {
    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}

// Create 1st block in the blockchain (AKA Genesis Block) being hardcoded and titled as genesis block 
var getGenesisBlock = () => {
    return new Block(0, "0", 1465154705, "my genesis block!!",
    "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
    };

// An in-memory JS array is used to store the blockchain
var blockchain = [getGenesisBlock()];

// // {{{{{ Test function }}}}} ====================================
// // Testing the creation of Genesis block and printing to the console
// function testApp() {
//     function showBlockchain(inputBlockchain) {
//         for (let i = 0; i < inputBlockchain.length; i++) {
//             console.log(inputBlockchain[i]);
//         }

//         console.log();
//     }

//     showBlockchain(blockchain);
// }
// testApp(); // ======================================================



// User-control node via HTTP REST API server
var initHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());

    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));
    app.post('/mineBlock', (req, res) => {
        var newBlock = generateNextBlock(req.body.data);
        // var newBlock = mineBlock(req.body.data);
        addBlock(newBlock);
        broadcast(responseLatestMsg());
        console.log('block added: ' + JSON.stringify(newBlock));
        res.send();
    });
    app.get('/peers', (req, res) => {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/addPeer', (req, res) => {
        connectToPeers([req.body.peer]);
        res.send();
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};

initHttpServer();

// Create a function for P2P server initP2PServer. It will initialize the server with given p2p_port. For communication between the peers, we will use ports 6xxx.
var initP2PServer = () => {
    var server = new WebSocket.Server({port: p2p_port});
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket p2p port on: ' + p2p_port);

};


// Create function that receives web socket and adds it to sockets array. Then call initMessageHandler, initErrorHandler and write functions.
var initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};


// Create function to parse the messages to JSON format and send them to console. It then writes the message according to its type.
var initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var message = JSON.parse(data);
        console.log('Received message' + JSON.stringify(message));
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
        }
    });
};

// Error Handler function - When something has gone wrong or an unexpected behavior has occurred, it will attempt to close the socket connection and show a message on the console.
var initErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};


// Get the last element in blockchain array
var getLatestBlock = () => blockchain[blockchain.length - 1];

// Implemented during the mining process..miner calculates the hash for the next block.
var calculateHash = (index, previousHash, timestamp, data) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
}


// This calculateHashForBlock() function will execute the calculateHash function for a given block and return SHA256 hash of a string which is the result of concatenating: block.index, block.previousHash, block.timestamp, and block.data.
var calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
};
// // {{{{{ Test function }}}}} ====================================
// // Test the hash calulator for new blocks
// function testCalcHashForBlock() {
//     console.log(calculateHashForBlock(getGenesisBlock()));
//     console.log();
// }
// testCalcHashForBlock(); // =======================================


// Generate NEXT BLOCK - Retrieve hash of previous block to verify linkage, then create new block with hash
var generateNextBlock = (blockData) => {
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};


// Validate block or chain of blocks' integrity
var isValidNewBlock = (newBlock, previousBlock) => {
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};


// If valid ADD BLOCK
var addBlock = (newBlock) => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
    }
};

// // {{{{{ Test function }}}}} ====================================
// // Test addition / validation of next block
// function testAddBlock() {
//     function showBlockchain(inputBlockchain) {
//         for (let i = 0; i < inputBlockchain.length; i++) {
//             console.log(inputBlockchain[i]);
//         }

//         console.log();
//     }

//     console.log("blockchain before addBlock() execution:");
//     showBlockchain(blockchain);
//     addBlock(generateNextBlock("test block data"));
//     console.log("\n");
//     console.log("blockchain after addBlock() execution:");
//     showBlockchain(blockchain);
// }
// testAddBlock(); // ================================================


// Perform elementary checks for network validity
var isValidChain = (blockchainToValidate) => {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};


// Create function that tries to initialize connections with other peers.
var connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};


// Create functionto receive the network P2P message and show us the appropriate answer depending on received blockchain.
var handleBlockchainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log("We can append the received block to our chain");
            blockchain.push(latestBlockReceived);
            broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.log("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        } else {
            console.log("Received blockchain is longer than current blockchain");
            replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than current blockchain. Do nothing');
    }
};


var replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    } else {
        console.log('Received blockchain invalid');
    }
};


// {{{{ MESSAGING CODE }}}}
var queryChainLengthMsg = () => ({'type': MessageType.QUERY_LATEST});
var queryAllMsg = () => ({'type': MessageType.QUERY_ALL});
var responseChainMsg = () =>({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)
});
var responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([getLatestBlock()])
});

// Implement the write function. It will take the web socket object and a JSON object as parameters. This function sends messages back to the client in a stringified JSON format.
var write = (ws, message) => ws.send(JSON.stringify(message));

// function for broadcasting messages to all sockets/peers that we are connected to.
var broadcast = (message) => sockets.forEach(socket => write(socket, message));


// Finally connect to peers and initialize the servers
connectToPeers(initialPeers);
initHttpServer();
initP2PServer();