// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require('fs');
const util = require('util');
/**
 * CustomLogger, takes in an activity and saves it for the duration of the conversation, writing to an emulator compatible transcript file in the transcriptsPath folder.
 */
class CustomLogger {
    /**
     * Log an activity to the transcript file.
     * @param activity Activity being logged.
     */
    constructor() {
        this.conversations = {};
        // to log user input only
        this.userInput = {};
    }

    logActivity(activity) {
        console.log('logActivity func call');
        if (!activity) {
            throw new Error('Activity is required.');
        }
        if (activity.conversation) {
            var id = activity.conversation.id;
            if (id.indexOf('|' !== -1)) {
                id = activity.conversation.id.replace(/\|.*/, '');
            }
        }

        if (activity.type === 'conversationUpdate' && !(id in this.conversations)) {
            console.log('new conversation');
            this.conversations[id] = [];
            this.conversations[id].push(activity);
        } else if (id in this.conversations) {
            this.conversations[id].push(activity);
        }
        // log only message text from user
        if (activity.from.name === 'User') {
            if (activity.type === 'message' && !(id in this.userInput)) {
                console.log('new user input log');
                this.userInput[id] = [];
                this.userInput[id].push(activity);
                console.log(this.userInput);
            } else if (id in this.userInput) {
                this.userInput[id].push(activity);
                console.log(this.userInput);
            }
        }

        if (activity.value === 'endOfInput') {
            console.log(this.conversations);
            console.log(this.userInput[id][1]);
            var transcriptfileName = 'testing.txt';

            var file = fs.createWriteStream(transcriptfileName, { flags: 'a' });
            file.on('error', function(err) { throw err; });
            let array_ = this.userInput[id];
            Object.keys(array_).forEach(function(key) { file.write(JSON.stringify(array_[key], null, 2) + '\n'); });
            file.end();

            // var transcriptfileName = util.format('%s/log_%s.transcript', process.env.transcriptsPath, id);
            /* fs.writeFile(transcriptfileName, this.userInput.array.forEach(element => {
                JSON.stringify(this.userInput, null, 2);
            }), function (err) {
                if (err) throw err;
            }); */
            delete this.conversations[id];
        }
    }
}

exports.CustomLogger = CustomLogger;
