// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { ChoicePrompt, DialogSet, WaterfallDialog } = require('botbuilder-dialogs');

// import Calendar reader.
const { CalendarReader } = require('./calendarReader');

const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_PROFILE_PROPERTY = 'user';

// Const for Calendar access
const MAY_I_HELP = 'may_I_help';
const LOOP_CALENDER = 'loop_calender';
const START_PROMPT = 'start_prompt';
const NEXT_PROMPT = 'next_prompt';
const UPDATE_PROMPT = 'update_prompt';

class LoggerBot {
    /**
     *
     * @param {ConversationState} conversationState A ConversationState object used to store the dialog state.
     * @param {UserState} userState A UserState object used to store values specific to the user.
     * @param {Update} calenderUpdate A Calendar object to store user's update calendar
     */
    constructor(conversationState, userState) {
        // Create a new state accessor property. See https://aka.ms/about-bot-state-accessors to learn more about bot state and state accessors.
        this.conversationState = conversationState;
        this.userState = userState;

        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.userProfile = this.userState.createProperty(USER_PROFILE_PROPERTY);

        // Add CalendarReader object
        this.calenderReader = new CalendarReader();

        this.dialogs = new DialogSet(this.dialogState);

        // Add prompts to request for user's input.
        this.dialogs.add(new ChoicePrompt(START_PROMPT));
        this.dialogs.add(new ChoicePrompt(NEXT_PROMPT));
        this.dialogs.add(new ChoicePrompt(UPDATE_PROMPT));

        // Create a dialog that asks if user want to start to read user's calendar
        this.dialogs.add(new WaterfallDialog(MAY_I_HELP, [
            this.promptForStart.bind(this),
            this.confirmStartPrompt.bind(this),
            this.confirmNextPrompt.bind(this)
            // TODO: need to add dialog here
        ]));

        // Create a dialog that asks if user want to continue to loop through the calendar items
        this.dialogs.add(new WaterfallDialog(LOOP_CALENDER, [
            this.readCalendarItem.bind(this),
            this.nextPromptLoop.bind(this)
        ]));
    }

    // This step in the dialog prompts the user to start.
    async promptForStart(step) {
        return await step.prompt(START_PROMPT, 'Shall we begin by reading your calendar?', ['yes', 'no']);
    }

    // This step captures the user intent to read or not his calendar.
    async confirmStartPrompt(step) {
        if (step.result) {
            if (step.result.value === 'yes') {
                // Access to user state for current reading entry
                const user = await this.userProfile.get(step.context, {});
                user.entryRead = 0;
                // Set flag to signal star reading calendar
                user.startReading = 1;
                // Save userProfile
                await this.userProfile.set(step.context, user);
                // Start the calendar reading
                // If there is item in the calendar
                if (this.calenderReader.getTotalEntry() > -1) {
                    let calenderItem = this.calenderReader.readCalendar(0);
                    await step.context.sendActivity(`on ${ calenderItem.date }
                    at ${ calenderItem.time }
                    you have ${ calenderItem.event }`);
                } else {
                    await step.context.sendActivity('You have no schedule in your calendar, call me when you need me.');
                    // Set to nothing to read
                    user.startReading = 0;
                    await this.userProfile.set(step.context, user);
                    return await step.endDialog();
                }
            } else if (step.result.value === 'no') {
                await step.context.sendActivity('Understand, just call me when you want');
                return await step.endDialog();
            }
        }
        await step.prompt(NEXT_PROMPT, 'Continue to next item?', ['yes', 'no']);
    }
    // This step captures the user intent to read next item by starting a loop
    async confirmNextPrompt(step) {
        if (step.result) {
            if (step.result.value === 'yes') {
                // Access to user state for current reading entry
                const user = await this.userProfile.get(step.context, {});
                user.loopFlag = 1;
                await this.userProfile.set(step.context, user);
                await step.beginDialog(LOOP_CALENDER);
            } else if (step.result.value === 'no') {
                await step.context.sendActivity('Understand, just call me when you want');
                return await step.endDialog();
            }
        }
    }

    // This is the 1st loop to read
    async readCalendarItem(step) {
        // Access to user state for current reading entry
        const user = await this.userProfile.get(step.context, {});
        let entryRead = user.entryRead;
        // Loop 3 times if possible else stop with what have
        for (let i = 1; i < 4; i++) {
            entryRead++;
            if (entryRead > this.calenderReader.getTotalEntry()) {
                // Stop looping as there is no more item to read
                user.startReading = 0;
                await this.userProfile.set(step.context, user);
                await step.context.sendActivity('No more schedule in your calendar, call me when you need me.');
                return await step.endDialog();
            }
            let calenderItem = this.calenderReader.readCalendar(entryRead);
            await step.context.sendActivity(`on ${ calenderItem.date }
            at ${ calenderItem.time }
            you have ${ calenderItem.event }`);
        }
        // Save current reading entry.
        user.entryRead = entryRead;
        await this.userProfile.set(step.context, user);
        // Ask if to continue.
        await step.prompt(NEXT_PROMPT, 'Continue to next item?', ['yes', 'no']);
    }
    // This step captures the user intent to read next item on his calendar.
    async nextPromptLoop(step) {
        if (step.result) {
            if (step.result.value === 'yes') {
                // TODO: Reading the next 3 items
                // Access to user state for current reading entry
                const user = await this.userProfile.get(step.context, {});
                let entryRead = user.entryRead;
                // Loop 3 times if possible else stop with what have
                for (let i = 1; i < 4; i++) {
                    entryRead++;
                    if (entryRead > this.calenderReader.getTotalEntry()) {
                        // Stop looping as there is no more item to read
                        user.startReading = 0;
                        await this.userProfile.set(step.context, user);
                        await step.context.sendActivity('No more schedule in your calendar, call me when you need me.');
                        return await step.endDialog();
                    }
                    let calenderItem = this.calenderReader.readCalendar(entryRead);
                    await step.context.sendActivity(`on ${ calenderItem.date }
                    at ${ calenderItem.time }
                    you have ${ calenderItem.event }`);
                }
                // Save current reading entry.
                user.entryRead = entryRead;
                await this.userProfile.set(step.context, user);
                // Ask if to continue.
                await step.prompt(NEXT_PROMPT, 'Continue to next item?', ['yes', 'no']);
                return await step.continueDialog();
            } else if (step.result.value === 'no') {
                await step.context.sendActivity('Understand, just call me when you want');
                return await step.endDialog();
            } else {
                return await step.next(-1);
            }
        }
    }

    /**
     *
     * @param {TurnContext} turnContext A TurnContext object that will be interpreted and acted upon by the bot.
     */
    async onTurn(turnContext) {
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Create a dialog context object.
            const dc = await this.dialogs.createContext(turnContext);

            const utterance = (turnContext.activity.text || '').trim().toLowerCase();
            if (utterance === 'cancel') {
                if (dc.activeDialog) {
                    await dc.cancelAllDialogs();
                    await dc.context.sendActivity(`Ok... canceled.`);
                } else {
                    await dc.context.sendActivity(`Nothing to cancel.`);
                }
            }

            // If the bot has not yet responded, continue processing the current dialog.
            await dc.continueDialog();

            // Start the sample dialog in response to any other input.
            if (!turnContext.responded) {
                // const user = await this.userProfile.get(dc.context, {});
                await dc.beginDialog(MAY_I_HELP);
            }
        } else if (
            turnContext.activity.type === ActivityTypes.ConversationUpdate
        ) {
            // Do we have any new members added to the conversation?
            if (turnContext.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (var idx in turnContext.activity.membersAdded) {
                    // Greet anyone that was not the target (recipient) of this message.
                    // Since the bot is the recipient for events from the channel,
                    // context.activity.membersAdded === context.activity.recipient.Id indicates the
                    // bot was added to the conversation, and the opposite indicates this is a user.
                    if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                        // Send a "this is what the bot does" message.
                        const description = [
                            'I am a bot that show how to read from a calendar\n',
                            'Say anything to continue.'
                        ];
                        await turnContext.sendActivity(description.join(' '));
                    }
                }
            }
        }

        // Save changes to the user state.
        await this.userState.saveChanges(turnContext);

        // End this turn by saving changes to the conversation state.
        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.LoggerBot = LoggerBot;
