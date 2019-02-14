
const fs = require('fs');
const util = require('util');

const fileName = 'myCalander.txt';
/**
 * Calander reader read from file that simulates a user calader
 */
class CalanderReader {
    /**
     * Read from file a calander
     * @param entryToRead which entry to read
     */
    // eslint-disable-next-line no-useless-constructor
    constructor() {}

    // Function return a Json object of the Calander
    readCalander(entryToRead) {
        console.log('method reach');
        let calander = JSON.parse(fs.readFileSync(fileName));
        console.log(calander.Entries[entryToRead]);
        return calander.Entries[entryToRead];
    }

    // Funtion return total entry available
    getTotalEntry() {
        let calader = JSON.parse(fs.readFileSync(fileName));
        return calader.total;
    }
}

exports.CalanderReader = CalanderReader;
