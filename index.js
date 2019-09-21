const config = require('./config.json')
const {google} = require('googleapis');
const ytdl = require('ytdl-core');
var yt = google.youtube('v3');
const Alexa = require('ask-sdk-core');
const skillBuilder = Alexa.SkillBuilders.custom();
//handlers
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput
        handlerInput.responseBuilder.speak(`Welcome to youtube!`)
        return responseBuilder.getResponse()
    },
}
const SearchHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'SearchIntent'
    }, async handle(handlerInput) {
        const { responseBuilder } = handlerInput
        let queriedData = await queryData(handlerInput.requestEnvelope.request.intent.slots.query.value)
        let parsedData = await parseData(queriedData, 0)
        //handlerInput.responseBuilder.speak(`Now Playing ${parsedData.title}`)
        responseBuilder.speak(`Now playing ${parsedData.title}`).withShouldEndSession(true) //Playing song
        addAudioPlayerPlayDirective(responseBuilder, 'REPLACE_ALL', parsedData)
        return responseBuilder.getResponse()
    }
}
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PauseIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
            )
    }, async handle(handlerInput) {
        handlerInput.responseBuilder.addAudioPlayerStopDirective()
        return handlerInput.responseBuilder.getResponse()
    },
}
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'
    },
    handle(handlerInput) {
        console.log(`Something went wrong: ${handlerInput.requestEnvelope.request.reason}`)
        return handlerInput.responseBuilder.getResponse()
    },
}
const ExceptionEncounteredRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered'
    },
    handle(handlerInput) {
        console.log(`Something went wrong: ${handlerInput.requestEnvelope.request.reason}`)
        return true
    },
}
const ErrorHandler = {
    canHandle() {
        return true
    },
    async handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`)
        return handlerInput.responseBuilder.getResponse()
    },
}
const addAudioPlayerPlayDirective = (responseBuilder, type, song, offset = 0, streamId = "stream-id", previousStreamId = "stream-id") => {
    if (type !== "ENQUEUE") previousStreamId = null
    responseBuilder.addAudioPlayerPlayDirective(type, song.url, streamId, offset, previousStreamId, {
        "title": song.title,
        "subtitle": song.artist,
        "art": {
            "sources": [
                {
                    "url": song.thumbnail
                }
            ]
        },
        "backgroundImage": {
            "sources": [
                {
                    "url": song.thumbnail
                }
            ]
        }
    })
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
exports.handler = skillBuilder
    .addRequestHandlers(
        SearchHandler,
        LaunchRequestHandler,
        CancelAndStopIntentHandler,
        ExceptionEncounteredRequestHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda()