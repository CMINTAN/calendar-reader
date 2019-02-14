
const fs = require('fs');

const fileName = 'myCalender.txt';
/**
 * Calender reader read from file that simulates a user calader
 */
class CalenderReader {
    /**
     * Read from file a calender
     * @param entryToRead which entry to read
     */
    // eslint-disable-next-line no-useless-constructor
    constructor() {}

    // Function return a Json object of the Calender
    readCalender(entryToRead) {
        console.log('method reach');
        let calender = JSON.parse(fs.readFileSync(fileName));
        console.log(calender.Entries[entryToRead]);
        return calender.Entries[entryToRead];
    }

    // Funtion return total entry available
    getTotalEntry() {
        let calader = JSON.parse(fs.readFileSync(fileName));
        return calader.total;
    }
}

exports.CalenderReader = CalenderReader;
