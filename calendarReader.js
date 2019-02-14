
const fs = require('fs');

const fileName = 'myCalendar.txt';
/**
 * Calendar reader read from file that simulates a user calader
 */
class CalendarReader {
    /**
     * Read from file a calendar
     * @param entryToRead which entry to read
     */
    // eslint-disable-next-line no-useless-constructor
    constructor() {}

    // Function return a Json object of the Calendar
    readCalendar(entryToRead) {
        console.log('method reach');
        let calendar = JSON.parse(fs.readFileSync(fileName));
        console.log(calendar.Entries[entryToRead]);
        return calendar.Entries[entryToRead];
    }

    // Funtion return total entry available
    getTotalEntry() {
        let calader = JSON.parse(fs.readFileSync(fileName));
        return calader.total;
    }
}

exports.CalendarReader = CalendarReader;
