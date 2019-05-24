'use strict'

const nextTick = require('async/nextTick')
const { messages, codes } = require('./errors')

const errCode = require('err-code')

module.exports = (node) => {
  const pubsub = node._pubsub

  return {
    subscribe: (topic, options, handler, callback) => {
      if (typeof options === 'function') {
        callback = handler
        handler = options
        options = {}
      }

      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      function subscribe (cb) {
        if (pubsub.listenerCount(topic) === 0) {
          pubsub.subscribe(topic)
        }

        pubsub.on(topic, handler)
        nextTick(cb)
      }

      subscribe(callback)
    },

    unsubscribe: (topic, handler, callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }
      if (!handler && !callback) {
        pubsub.removeAllListeners(topic)
      } else {
        pubsub.removeListener(topic, handler)
      }

      if (pubsub.listenerCount(topic) === 0) {
        pubsub.unsubscribe(topic)
      }

      if (typeof callback === 'function') {
        nextTick(() => callback())
      }
    },

    publish: (topic, data, callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (!Buffer.isBuffer(data)) {
        return nextTick(callback, errCode(new Error('data must be a Buffer'), 'ERR_DATA_IS_NOT_A_BUFFER'))
      }

      pubsub.publish(topic, data, callback)
    },

    ls: (callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      const subscriptions = Array.from(pubsub.subscriptions)

      nextTick(() => callback(null, subscriptions))
    },

    peers: (topic, callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (typeof topic === 'function') {
        callback = topic
        topic = null
      }

      const peers = Array.from(pubsub.peers.values())
        .filter((peer) => topic ? peer.topics.has(topic) : true)
        .map((peer) => peer.info.id.toB58String())

      nextTick(() => callback(null, peers))
    },

    setMaxListeners (n) {
      return pubsub.setMaxListeners(n)
    }
  }
}
