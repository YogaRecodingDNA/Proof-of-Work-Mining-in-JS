'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

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

// {{{{{ Test function }}}}} ====================================
// Testing the creation of Genesis block and printing to the console
function testApp() {
    function showBlockchain(inputBlockchain) {
        for (let i = 0; i < inputBlockchain.length; i++) {
            console.log(inputBlockchain[i]);
        }

        console.log();
    }

    showBlockchain(blockchain);
}
testApp(); // ======================================================


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
// {{{{{ Test function }}}}} ====================================
// Test the hash calulator for new blocks
function testCalcHashForBlock() {
    console.log(calculateHashForBlock(getGenesisBlock()));
}
testCalcHashForBlock(); // =======================================