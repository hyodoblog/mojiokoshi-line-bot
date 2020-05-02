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
    case 'message':
      const message = event.message
      let text
      switch (message.type) {
        case 'text':
          text = message.text
          await replyText(replyToken, text)
          return 'オウム返し成功'
        default:
          text = 'テキストを送信してください'
          await replyText(replyToken, text)
          return 'その他'
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

module.exports = router
