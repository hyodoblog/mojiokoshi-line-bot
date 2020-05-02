'use strict'

/**
 * ライブラリのインポート
 */
const line = require('@line/bot-sdk')
const express = require('express')

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
          return '画像を文字起こししました'
  
        case 'audio':
          // 音声を受信した際の処理
          return '音声を文字起こししました'
  
        case 'video':
          // 動画を受信した際の処理
          return '動画を文字起こししました'
  
        default:
          // 画像、音声、動画以外を受信した際の処理
          text = '画像、音声、動画を送信していてください'
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
  texts = Array.isArray(texts) ? texts : [texts]
  return client.replyMessage(
    token,
    texts.map((text) => ({ type: 'text', text }))
  )
}

module.exports = router
