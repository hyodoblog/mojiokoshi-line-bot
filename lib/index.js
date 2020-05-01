'use strict'

/**
 * ライブラリの読み込み
 */
const line = require('@line/bot-sdk')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffprobePath = require('@ffprobe-installer/ffprobe').path
const ffmpeg = require('fluent-ffmpeg')
const streamifier = require('streamifier')

/**
 * 初期設定
 */
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
const client = new line.Client(config)
ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

/**
 * 自作関数群
 */

 /**
  * 2000文字を区切りテキストを分割し配列を返す関数
  * @param {String} text
  */
exports.getTextArray = text => {
  const texts = []
  if (text.length > 2000) {
    while (text.length > 2000) {
      texts.push(text.substr(0, 2000))
      text = text.slice(2000, -1)
    }
  }
  texts.push(text)
  return texts
}

/**
 * LINEサーバーからファイルをbufferでダウンロード
 * @param {Number} messageId
 */
exports.getContentBuffer = messageId => {
  return new Promise((resolve, reject) => {
    client.getMessageContent(messageId).then(stream => {
      const content = []
      stream
        .on('data', chunk => {
          content.push(Buffer.from(chunk))
        })
        .on('error', reject)
        .on('end', () => {
          resolve(Buffer.concat(content))
        })
    })
  })
}

/**
 * 音声・動画の秒数、サンプリング周波数、チャンネル数を取得
 * @param {Buffer} buffer
 */
exports.getAudioMetaData = buffer => {
  return new Promise((resolve, reject) => {
    const inStream = streamifier.createReadStream(buffer)
    ffmpeg(inStream).ffprobe(0, (err, metaData) => {
      if (err) {
        reject(err)
        return
      }

      const stream = metaData.streams.find(chunk => 'sample_rate' in chunk)
      const sampleRateHertz = stream.sample_rate
      const audioChannelCount = stream.channels

      resolve({
        sampleRateHertz,
        audioChannelCount
      })
    })
  })
}

/**
 * 音声をflacにエンコード
 * @param {Buffer} audioBuffer
 */
exports.audioToFlac = async audioBuffer => {
  return new Promise((resolve, reject) => {
    const inStream = streamifier.createReadStream(audioBuffer)
    const content = []
    ffmpeg(inStream)
      .audioCodec('flac')
      .format('flac')
      .pipe()
      .on('data', chunk => {
        content.push(Buffer.from(chunk))
      })
      .on('error', reject)
      .on('end', () => {
        resolve(Buffer.concat(content))
      })
  })
}

/**
 * 動画から音声のみを抽出しflacにエンコード
 * @param {Buffer} videoBuffer
 */
exports.videoToFlac = videoBuffer => {
  return new Promise((resolve, reject) => {
    const inStream = streamifier.createReadStream(videoBuffer)
    const content = []
    ffmpeg(inStream)
      .withNoVideo()
      .audioCodec('flac')
      .format('flac')
      .pipe()
      .on('data', chunk => {
        content.push(Buffer.from(chunk))
      })
      .on('error', reject)
      .on('end', () => {
        resolve(Buffer.concat(content))
      })
  })
}
