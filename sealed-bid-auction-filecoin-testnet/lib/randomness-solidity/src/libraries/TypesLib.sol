// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./BLS.sol";

library TypesLib {
    // Signature request struct for signature request type
    struct SignatureRequest {
        bytes message; // plaintext message to hash and sign
        bytes messageHash; // hashed message to sign
        bytes condition; // optional condition, length can be zero for immediate message signing
        string schemeID; // signature scheme id, e.g., "BN254", "BLS12-381", "TESS"
        address callback; // the requester address to call back. Must implement ISignatureReceiver interface to support the required callback
        bytes signature;
        bool isFulfilled;
    }

    // Blocklock request stores details needed to generate blocklock decryption keys
    struct BlocklockRequest {
        uint256 decryptionRequestID;
        uint256 blockHeight;
        Ciphertext ciphertext;
        bytes signature;
        bytes decryptionKey;
        address callback;
    }

    // Ciphertext representing data encrypted off-chain
    struct Ciphertext {
        BLS.PointG2 u;
        bytes v;
        bytes w;
    }

    // Decryption request stores details for each decryption request
    struct DecryptionRequest {
        string schemeID; // signature scheme id, e.g., "BN254", "BLS12-381", "TESS"
        bytes ciphertext;
        bytes condition;
        bytes decryptionKey;
        bytes signature;
        address callback;
        bool isFulfilled;
    }

    // Randomness request stores details needed to verify the signature
    struct RandomnessRequest {
        uint256 nonce;
        address callback;
    }
}
