/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const series = require('async/series')
const createNode = require('./utils/create-node')
const sinon = require('sinon')
const { createLibp2p } = require('../src')
const WS = require('libp2p-websockets')
const PeerInfo = require('peer-info')

describe('libp2p creation', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('should be able to start and stop successfully', (done) => {
    createNode([], {
      config: {
        pubsub: {
          enabled: true
        },
        dht: {
          enabled: true
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()

      let sw = node._switch
      let cm = node.connectionManager
      let dht = node._dht
      let pub = node._pubsub

      sinon.spy(sw, 'start')
      sinon.spy(cm, 'start')
      sinon.spy(dht, 'start')
      sinon.spy(dht.randomWalk, 'start')
      sinon.spy(pub, 'start')
      sinon.spy(sw, 'stop')
      sinon.spy(cm, 'stop')
      sinon.spy(dht, 'stop')
      sinon.spy(dht.randomWalk, 'stop')
      sinon.spy(pub, 'stop')
      sinon.spy(node, 'emit')

      series([
        (cb) => node.start(cb),
        (cb) => {
          expect(sw.start.calledOnce).to.equal(true)
          expect(cm.start.calledOnce).to.equal(true)
          expect(dht.start.calledOnce).to.equal(true)
          expect(dht.randomWalk.start.calledOnce).to.equal(true)
          expect(pub.start.calledOnce).to.equal(true)
          expect(node.emit.calledWith('start')).to.equal(true)

          cb()
        },
        (cb) => node.stop(cb)
      ], (err) => {
        expect(err).to.not.exist()

        expect(sw.stop.calledOnce).to.equal(true)
        expect(cm.stop.calledOnce).to.equal(true)
        expect(dht.stop.calledOnce).to.equal(true)
        expect(dht.randomWalk.stop.called).to.equal(true)
        expect(pub.stop.calledOnce).to.equal(true)
        expect(node.emit.calledWith('stop')).to.equal(true)

        done()
      })
    })
  })

  it('should not create disabled modules', (done) => {
    createNode([], {
      config: {
        pubsub: {
          enabled: false
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()
      expect(node._pubsub).to.not.exist()
      done()
    })
  })

  it('should not throw errors from switch if node has no error listeners', (done) => {
    createNode([], {}, (err, node) => {
      expect(err).to.not.exist()

      node._switch.emit('error', new Error('bad things'))
      done()
    })
  })

  it('should emit errors from switch if node has error listeners', (done) => {
    const error = new Error('bad things')
    createNode([], {}, (err, node) => {
      expect(err).to.not.exist()
      node.once('error', (err) => {
        expect(err).to.eql(error)
        done()
      })
      node._switch.emit('error', error)
    })
  })

  it('createLibp2p should create a peerInfo instance', function (done) {
    this.timeout(10e3)
    createLibp2p({
      modules: {
        transport: [ WS ]
      }
    }, (err, libp2p) => {
      expect(err).to.not.exist()
      expect(libp2p).to.exist()
      done()
    })
  })

  it('createLibp2p should allow for a provided peerInfo instance', function (done) {
    this.timeout(10e3)
    PeerInfo.create((err, peerInfo) => {
      expect(err).to.not.exist()
      sinon.spy(PeerInfo, 'create')
      createLibp2p({
        peerInfo,
        modules: {
          transport: [ WS ]
        }
      }, (err, libp2p) => {
        expect(err).to.not.exist()
        expect(libp2p).to.exist()
        expect(PeerInfo.create.callCount).to.eql(0)
        done()
      })
    })
  })
})
