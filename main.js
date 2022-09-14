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

var getGenesisBlock = () => {
    return new Block(0, "0", 1465154705, "my genesis block!!",
    "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
    };

    var blockchain = [getGenesisBlock()];

    function testApp() {
        function showBlockchain(inputBlockchain) {
            for (let i = 0; i < inputBlockchain.length; i++) {
                console.log(inputBlockchain[i]);
            }

            console.log();
        }

        showBlockchain(blockchain);
    }