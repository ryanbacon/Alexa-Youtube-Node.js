'use strict';
const config = require('./config.json')
const {google} = require('googleapis');
const ytdl = require('ytdl-core');
var yt = google.youtube('v3');
const Alexa = require('ask-sdk-core');
const skillBuilder = Alexa.SkillBuilders.custom();
/* legacy shit
const PlayStreamIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (
                handlerInput.requestEnvelope.request.intent.name === 'SearchIntent'
            );
    },
    handle(handlerInput) {
        let stream = STREAMS[0];
        handlerInput.responseBuilder
            .speak(`I heard you loud and clear!`)
            //.addAudioPlayerPlayDirective('REPLACE_ALL', stream.url, stream.token, 0, null, stream.metadata);
        return handlerInput.responseBuilder
            .getResponse();
    },
};
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        return handlerInput.responseBuilder
            .addAudioPlayerClearQueueDirective('CLEAR_ALL')
            .addAudioPlayerStopDirective()
            .getResponse();
    },
};
exports.handler = skillBuilder
    .addRequestHandlers(
        PlayStreamIntentHandler,
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
*/
exports.handler = function (event, context) {
    try {
        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};
//Called when the session starts.
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
    // add any session init logic here
}
//Called when the user invokes the skill without specifying what they want.
function onLaunch(launchRequest, session, callback) {
    var titleBox = "Youtube Music",
        textBox = "Usage: Ask alexa to play {Song}",
        speech = "Hello there! You can search youtube by saying. Alexa, ask youtube to play your song";
    callback(session.attributes, buildSpeechletResponse(titleBox, textBox, speech, "", true));

}
//Called when the user specifies an intent for this skill.
async function onIntent(intentRequest, session, callback) {
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name,
        query = intentRequest.intent.slots.query.value,
        titleBox = "Youtube Music";
    // dispatch custom intents to handlers here
    if (intentName == 'SearchIntent') {
        if(query){
            let queriedData = await queryData(query)
            let parsedData = await parseData(queriedData, 0)
            let speech = "Now playing "+parsedData.title.toString(),
                textBox = parsedData.title.toString();
            callback(session.attributes, buildSpeechletResponse(titleBox, textBox, speech, "", true));
        }
    }
    else {
        throw "Invalid intent";
    }
}
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}
//music shit
async function queryData(query){
    return new Promise(result => {
        yt.search.list({
            auth: config.ytkey,
            part: 'id,snippet',
            type: 'video',
            q: query
        }, (err, response) => {
            if(err){
                throw(err);
            } else {
                result(response.data.items)
            }
        })
    })
}
async function parseData(videos, item){
    if (videos.length === 0) return message.channel.send("No video found.")
    else {
        return new Promise(result => {
            var video = {
                title: videos[item].snippet.title,
                url: `https://www.youtube.com/watch?v=${videos[0].id.videoId}`,
                thumbnail: videos[item].snippet.thumbnails.high.url,
                description: videos[item].snippet.description,
                publishedDate: videos[item].snippet.publishedAt,
                channel: videos[item].snippet.channelTitle,
            }
            result(video);
        })
    }
}
//response templates
function buildSpeechletResponse(titleBox, textBox, speech, repromptText, shouldEndSession) {
    return {
        outputSpeech: {type: "PlainText", text: speech},
        card: {type: "Simple", title: titleBox, content: textBox},
        reprompt: {
            outputSpeech: {type: "PlainText", text: repromptText}
        },
        shouldEndSession: shouldEndSession
    };
}
function build_audio_speechlet_response(titleBox, textBox, speech, repromptText, should_end_session, url, token, offsetInMilliseconds=0) {
    return {
        outputSpeech: {type: "PlainText", text: speech},
        card: {type: "Simple", title: titleBox, content: textBox},
        reprompt: {
            outputSpeech: {type: "PlainText", text: repromptText}
        },
        directives: [{
            type: audioItem.stream,
            playBehavior: 'REPLACE_ALL',
            audioItem: {
                stream: {
                    token: 'NEED TO FIGURE OUT WHAT THIS DOES',
                    url: 'yourtube url?',
                    offsetInMilliseconds: 'idk'
                }
            }
        }],
        shouldEndSession: shouldEndSession
    }
}
function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}



