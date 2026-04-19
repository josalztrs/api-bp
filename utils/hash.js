const crypto = require('crypto');

function generateSHA256(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

function verifyHash(input, hash) {
    return generateSHA256(input) === hash;
}

module.exports = {
    generateSHA256,
    verifyHash
};