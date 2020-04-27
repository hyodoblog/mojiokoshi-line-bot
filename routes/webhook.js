'use strict'

/**
 * ライブラリのインポート
 */
const line = require('@line/bot-sdk')
const express = require('express')
const gcloudApi = require('../lib/gcloud-api')
const func = require('../lib/index')

/**
 * 初期化
 */
const router = express.Router()
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
const client = new line.Client(config)
const ONE_MINUTES = 60000

/**
 * 動作確認用のルート
 */
router.get('/', (req, res) => {
  res.send('Hello World')
  res.status(200).end()
})

/**
 * 本番用のルート
 */
router.post('/', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handlerEvent))
    .then((result) => {
      console.log(result)
      res.status(200).end()
    })
    .catch((err) => {
      console.error(err)
      res.status(500).end()
    })
})

/**
 * メイン関数
 */
const handlerEvent = async (event) => {
  // Webhookの検証
  if (event.replyToken && event.replyToken.match(/^(.)\1*$/)) {
    return 'Webhookの検証'
  }

  const replyToken = event.replyToken

  // イベントの処理
  switch (event.type) {
    case 'follow':
      return 'フォローされました'

    case 'unfollow':
      return 'フォロー解除されました'

    case 'message':
      const message = event.message
      let text
      switch (message.type) {
        case 'image':
          // 画像を受信した際の処理
          text = await imageToText(message.id)
          await replyText(replyToken, text)
          return '画像を文字起こししました'

        case 'audio':
          // 音声を受信した際の処理
          text = await audioToText(message.id, message.duration)
          await replyText(replyToken, text)
          return '音声を文字起こししました'

        case 'video':
          // 動画を受信した際の処理
          text = await videoToText(message.id, message.duration)
          await replyText(replyToken, text)
          return '動画を文字起こししました'

        default:
          text = '画像、音声、動画のどれかを送信してください'
          await replyText(replyToken, text)
          return '画像、音声、動画以外を受信'
      }
    
    default:
      return 'その他'
  }
}

/**
 * テキストを返信する関数
 * @param {String} token
 * @param {String[] | String} texts
 */
const replyText = (token, texts) => {
  texts = Array.isArray(texts) ? texts : [texts];
  return client.replyMessage(
    token,
    texts.map((text) => ({ type: 'text', text }))
  );
};

/**
 * 画像をテキストに変換する関数
 * @param {Number} messageId
 */
const imageToText = async (messageId) => {
  const buffer = await func.getContentBuffer(messageId)
  const text = await gcloudApi.visionText(buffer)
  const texts = await func.getTextArray(text)
  return texts
};

/**
 * 音声をテキストに変換する関数
 * @param {Number} messageId
 */
const audioToText = async (messageId, duration) => {
  if (duration >= ONE_MINUTES) return '1分未満の音声を送信してください'
  let buffer = await func.getContentBuffer(messageId)
  buffer = await func.audioToFlac(buffer)

  const metaData = await func.getAudioMetaData(buffer)
  const text = await gcloudApi.cloudSpeechToText(
    buffer,
    {
      sampleRateHertz: metaData.sampleRateHertz,
      audioChannelCount: metaData.audioChannelCount
    }
  )

  const texts = await func.getTextArray(text)

  return texts
};

/**
 * 動画をテキストに変換する関数
 * @param {Number} messageId
 */
const videoToText = async (messageId, duration) => {
  if (duration >= ONE_MINUTES) return '1分未満の動画を送信してください'
  let buffer = await func.getContentBuffer(messageId)
  buffer = await func.videoToFlac(buffer)

  const metaData = await func.getAudioMetaData(buffer)
  const text = await gcloudApi.cloudSpeechToText(
    buffer,
    {
      sampleRateHertz: metaData.sampleRateHertz,
      audioChannelCount: metaData.audioChannelCount
    }
  )

  const texts = await func.getTextArray(text)

  return texts
};

module.exports = router
