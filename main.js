'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

var http_port = process.env.HTTP_PORT || 3001;

var sockets = [];

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
        // broadcast(responseLatestMsg());
        console.log('block added: ' + JSON.stringify(newBlock));
        res.send();
    });
    app.get('/peers', (req, res) => {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/addPeer', (req, res) => {
        // connectToPeers([req.body.peer]);
        res.send();
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};

// initHttpServer();





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


var replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    } else {
        console.log('Received blockchain invalid');
    }
};