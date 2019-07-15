/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const WS = require('libp2p-websockets')
const Bootstrap = require('libp2p-bootstrap')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const DHT = require('libp2p-kad-dht')

const validateConfig = require('../src/config').validate

describe('configuration', () => {
  let peerInfo

  before((done) => {
    waterfall([
      (cb) => PeerId.create({ bits: 512 }, cb),
      (peerId, cb) => PeerInfo.create(peerId, cb),
      (info, cb) => {
        peerInfo = info
        cb()
      }
    ], () => done())
  })

  it('should throw an error if peerInfo is missing', () => {
    expect(() => {
      validateConfig({
        modules: {
          transport: [ WS ]
        }
      })
    }).to.throw()
  })

  it('should throw an error if modules is missing', () => {
    expect(() => {
      validateConfig({
        peerInfo
      })
    }).to.throw()
  })

  it('should throw an error if there are no transports', () => {
    expect(() => {
      validateConfig({
        peerInfo,
        modules: {
          transport: [ ]
        }
      })
    }).to.throw('ERROR_EMPTY')
  })

  it('should add defaults to config', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        dht: DHT
      }
    }

    const expected = {
      peerInfo,
      connectionManager: {
        minPeers: 25
      },
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        dht: DHT
      },
      config: {
        peerDiscovery: {
          autoDial: true
        },
        pubsub: {
          enabled: false
        },
        dht: {
          kBucketSize: 20,
          enabled: false,
          randomWalk: {
            enabled: false,
            queriesPerPeriod: 1,
            interval: 300000,
            timeout: 10000
          }
        },
        relay: {
          enabled: true,
          hop: {
            active: false,
            enabled: false
          }
        }
      }
    }

    expect(validateConfig(options)).to.deep.equal(expected)
  })

  it('should add defaults to missing items', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        dht: DHT
      },
      config: {
        peerDiscovery: {
          bootstrap: {
            interval: 1000,
            enabled: true
          }
        }
      }
    }

    const expected = {
      peerInfo,
      connectionManager: {
        minPeers: 25
      },
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        dht: DHT
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          bootstrap: {
            interval: 1000,
            enabled: true
          }
        },
        pubsub: {
          enabled: false
        },
        dht: {
          kBucketSize: 20,
          enabled: false,
          randomWalk: {
            enabled: false,
            queriesPerPeriod: 1,
            interval: 300000,
            timeout: 10000
          }
        },
        relay: {
          enabled: true,
          hop: {
            active: false,
            enabled: false
          }
        }
      }
    }

    expect(validateConfig(options)).to.deep.equal(expected)
  })

  it('should allow for configuring the switch', () => {
    const options = {
      peerInfo,
      switch: {
        blacklistTTL: 60e3,
        blackListAttempts: 5,
        maxParallelDials: 100,
        maxColdCalls: 50,
        dialTimeout: 30e3
      },
      modules: {
        transport: [ WS ],
        peerDiscovery: [ ]
      }
    }

    expect(validateConfig(options)).to.deep.include({
      switch: {
        blacklistTTL: 60e3,
        blackListAttempts: 5,
        maxParallelDials: 100,
        maxColdCalls: 50,
        dialTimeout: 30e3
      }
    })
  })

  it('should allow for delegated content and peer routing', () => {
    const peerRouter = new DelegatedPeerRouter()
    const contentRouter = new DelegatedContentRouter(peerInfo)

    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        peerRouting: [ peerRouter ],
        contentRouting: [ contentRouter ],
        dht: DHT
      },
      config: {
        peerDiscovery: {
          bootstrap: {
            interval: 1000,
            enabled: true
          }
        }
      }
    }

    expect(validateConfig(options).modules).to.deep.include({
      peerRouting: [ peerRouter ],
      contentRouting: [ contentRouter ]
    })
  })

  it('should not allow for dht to be enabled without it being provided', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ]
      },
      config: {
        dht: {
          enabled: true
        }
      }
    }

    expect(() => validateConfig(options)).to.throw()
  })

  it('should be able to add validators and selectors for dht', () => {
    const selectors = {}
    const validators = {}

    const options = {
      peerInfo,
      modules: {
        transport: [WS],
        dht: DHT
      },
      config: {
        dht: {
          selectors,
          validators
        }
      }
    }
    const expected = {
      peerInfo,
      connectionManager: {
        minPeers: 25
      },
      modules: {
        transport: [WS],
        dht: DHT
      },
      config: {
        pubsub: {
          enabled: false
        },
        peerDiscovery: {
          autoDial: true
        },
        relay: {
          enabled: true,
          hop: {
            active: false,
            enabled: false
          }
        },
        dht: {
          selectors,
          validators
        }
      }
    }
    expect(validateConfig(options)).to.deep.equal(expected)
  })

  it('should support new properties for the dht config', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [WS],
        dht: DHT
      },
      config: {
        dht: {
          kBucketSize: 20,
          enabled: false,
          myNewDHTConfigProperty: true,
          randomWalk: {
            enabled: false,
            queriesPerPeriod: 1,
            interval: 300000,
            timeout: 10000
          }
        }
      }
    }

    const expected = {
      kBucketSize: 20,
      enabled: false,
      myNewDHTConfigProperty: true,
      randomWalk: {
        enabled: false,
        queriesPerPeriod: 1,
        interval: 300000,
        timeout: 10000
      }
    }

    const actual = validateConfig(options).config.dht

    expect(actual).to.deep.equal(expected)
  })
})
