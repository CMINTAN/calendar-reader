// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { ChoicePrompt, DialogSet, NumberPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

// import Calender reader.
const { CalenderReader } = require('./calenderReader');

const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_PROFILE_PROPERTY = 'user';

const WHO_ARE_YOU = 'who_are_you';
const HELLO_USER = 'hello_user';

const NAME_PROMPT = 'name_prompt';
const CONFIRM_PROMPT = 'confirm_prompt';
const AGE_PROMPT = 'age_prompt';

// Const for Calender access
const MAY_I_HELP = 'may_I_help';
const LOOP_CALENDER = 'loop_calender';
const UPDATE_COMPLETED = 'update_completed';
const START_PROMPT = 'start_prompt';
const NEXT_PROMPT = 'next_prompt';
const UPDATE_PROMPT = 'update_prompt';

class LoggerBot {
    /**
     *
     * @param {ConversationState} conversationState A ConversationState object used to store the dialog state.
     * @param {UserState} userState A UserState object used to store values specific to the user.
     * @param {Update} calenderUpdate A Calender object to store user's update calender
     */
    constructor(conversationState, userState) {
        // Create a new state accessor property. See https://aka.ms/about-bot-state-accessors to learn more about bot state and state accessors.
        this.conversationState = conversationState;
        this.userState = userState;

        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.userProfile = this.userState.createProperty(USER_PROFILE_PROPERTY);

        // Add CalenderReader object
        this.calenderReader = new CalenderReader();

        this.dialogs = new DialogSet(this.dialogState);

        // Add prompts that will be used by the main dialogs.
        this.dialogs.add(new TextPrompt(NAME_PROMPT));
        this.dialogs.add(new ChoicePrompt(CONFIRM_PROMPT));
        this.dialogs.add(new NumberPrompt(AGE_PROMPT, async (prompt) => {
            if (prompt.recognized.succeeded) {
                if (prompt.recognized.value <= 0) {
                    await prompt.context.sendActivity(`Your age can't be less than or equal to zero.`);
                    return false;
                } else {
                    return true;
                }
            }

            return false;
        }));

        // Add prompts to request for user's input.
        this.dialogs.add(new ChoicePrompt(START_PROMPT));
        this.dialogs.add(new ChoicePrompt(NEXT_PROMPT));
        this.dialogs.add(new ChoicePrompt(UPDATE_PROMPT));

        // Create a dialog that asks if user want to start to read user's calender
        this.dialogs.add(new WaterfallDialog(MAY_I_HELP, [
            this.promptForStart.bind(this),
            this.confirmStartPrompt.bind(this),
            this.confirmNextPrompt.bind(this)
            // TODO: need to add dialog here
        ]));

        // Create a dialog that asks if user want to continue to loop through the calender items
        this.dialogs.add(new WaterfallDialog(LOOP_CALENDER, [
            this.readCalenderItem.bind(this),
            this.nextPromptLoop.bind(this)
        ]));

        // Create a dialog that asks the user for their name.
        this.dialogs.add(new WaterfallDialog(WHO_ARE_YOU, [
            this.promptForName.bind(this),
            this.confirmAgePrompt.bind(this),
            this.promptForAge.bind(this),
            this.captureAge.bind(this)
        ]));

        // Create a dialog that displays a user name after it has been collected.
        this.dialogs.add(new WaterfallDialog(HELLO_USER, [
            this.displayProfile.bind(this)
        ]));
    }

    // This step in the dialog prompts the user to start.
    async promptForStart(step) {
        return await step.prompt(START_PROMPT, 'Shall we begin by reading your calender?', ['yes', 'no']);
    }

    // This step captures the user intent to read or not his calender.
    async confirmStartPrompt(step) {
        if (step.result) {
            if (step.result.value === 'yes') {
                // Access to user state for current reading entry
                const user = await this.userProfile.get(step.context, {});
                user.entryRead = 0;
                // Set flag to signal star reading calender
                user.startReading = 1;
                // Save userProfile
                await this.userProfile.set(step.context, user);
                // Start the calender reading
                // If there is item in the calender
                if (this.calenderReader.getTotalEntry() > -1) {
                    let calenderItem = this.calenderReader.readCalender(0);
                    await step.context.sendActivity(`on ${ calenderItem.date }
                    at ${ calenderItem.time }
                    you have ${ calenderItem.event }`);
                } else {
                    await step.context.sendActivity('You have no schedule in your calender, call me when you need me.');
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
    async readCalenderItem(step) {
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
                await step.context.sendActivity('No more schedule in your calender, call me when you need me.');
                return await step.endDialog();
            }
            let calenderItem = this.calenderReader.readCalender(entryRead);
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
    // This step captures the user intent to read next item on his calender.
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
                        await step.context.sendActivity('No more schedule in your calender, call me when you need me.');
                        return await step.endDialog();
                    }
                    let calenderItem = this.calenderReader.readCalender(entryRead);
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

    // This step in the dialog prompts the user for their name.
    async promptForName(step) {
        return await step.prompt(NAME_PROMPT, `What is your name, human?`);
    }

    // This step captures the user's name, then prompts whether or not to collect an age.
    async confirmAgePrompt(step) {
        const user = await this.userProfile.get(step.context, {});
        user.name = step.result;
        await this.userProfile.set(step.context, user);
        await step.prompt(CONFIRM_PROMPT, 'Do you want to give your age?', ['yes', 'no']);
    }

    // This step checks the user's response - if yes, the bot will proceed to prompt for age.
    // Otherwise, the bot will skip the age step.
    async promptForAge(step) {
        if (step.result && step.result.value === 'yes') {
            return await step.prompt(AGE_PROMPT, {
                prompt: `What is your age?`,
                retryPrompt: 'Sorry, please specify your age as a positive number or say cancel.'
            }
            );
        } else {
            return await step.next(-1);
        }
    }

    // This step captures the user's age.
    async captureAge(step) {
        const user = await this.userProfile.get(step.context, {});
        if (step.result !== -1) {
            user.age = step.result;
            await this.userProfile.set(step.context, user);
            await step.context.sendActivity(`I will remember that you are ${ step.result } years old.`);
        } else {
            await step.context.sendActivity(`No age given.`);
        }
        return await step.endDialog();
    }

    // This step displays the captured information back to the user.
    async displayProfile(step) {
        const user = await this.userProfile.get(step.context, {});
        if (user.age) {
            await step.context.sendActivity({ value: 'endOfInput', text: `Your name is ${ user.name } and you are ${ user.age } years old.` });
        } else {
            await step.context.sendActivity({ value: 'endOfInput', text: `Your name is ${ user.name } and you did not share your age.` });
        }
        return await step.endDialog();
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
                /* if (user.name) {
                    await dc.beginDialog(HELLO_USER);
                } else {
                    await dc.beginDialog(WHO_ARE_YOU);
                } */
                /* if (user.startReading === 2) {
                    // If there are more than one item in the calender, loop it
                    await dc.beginDialog(LOOP_CALENDER);
                } else {
                    await dc.beginDialog(MAY_I_HELP);
                } */
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
                            'I am a bot that demonstrates custom logging.',
                            'We will have a short conversation where I ask a few questions ',
                            'to collect your name and age, then store those values in UserState for later use.',
                            'after this you will be able to find a log of the conversation in the folder set by the transcriptsPath environment variable',
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
