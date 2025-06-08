// Test file to demonstrate gitignore functionality
// This file should be ignored if *.js is in .gitignore

const fs = require('fs');
const path = require('path');

console.log('This is a test JavaScript file that might be ignored by .gitignore');

// Import some local files
const utils = require('./src/utils'); // This would be ignored in analysis if this file is ignored

module.exports = {
    testFunction: () => {
        console.log('Testing gitignore functionality');
    }
}; 