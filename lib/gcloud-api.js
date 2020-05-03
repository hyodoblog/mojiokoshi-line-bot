'use strict'

/**
* ライブラリの読み込み
*/
const vision = require('@google-cloud/vision')
const speech = require('@google-cloud/speech')

/**
* Cloud Vision text detection
* 画像からテキストを抽出する
* @param {buffer} imageBuffer
*/
exports.cloudVisionText = async imageBuffer => {
  const client = new vision.ImageAnnotatorClient()
  const results = await client.textDetection({
    image: { content: imageBuffer }
  })
  if (results[0].fullTextAnnotation === null) {
    const message = 'テキストが抽出できませんでした'
    return message
  } else {
    const message = results[0].fullTextAnnotation.text
    return message
  }
}

/**
 * Cloud Speech-To-Text
 * 画像からテキストを抽出する
 * @param {Buffer} buffer
 * @param {String} encoding
 * @param {string} languageCode
 * @param {String} model
 * @param {Number} sampleRateHertz
 * @param {Number} audioChannelCount
 */
exports.cloudSpeechToText = async (
  buffer,
  {
    encoding = 'FLAC',
    model = 'default',
    sampleRateHertz = 16000,
    audioChannelCount = 2,
    languageCode = 'ja-JP'
  }
) => {
  const client = new speech.SpeechClient()

  const config = {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    model: model,
    audioChannelCount: audioChannelCount
  }

  const audio = {
    content: buffer.toString('base64')
  }

  const request = {
    config: config,
    audio: audio
  }

  const [response] = await client.recognize(request)
  const transcription = response.results
    .map(result => {
      return result.alternatives[0].transcript
    })
    .join('\n')

  if (transcription === '') {
    return '音声を抽出できませんでした...\n音を大きくしてみてください！'
  }

  return transcription
}