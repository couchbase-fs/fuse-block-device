const blockDevice = require('./')
var couchbase = require('couchbase');
var cluster = new couchbase.Cluster('couchbase://127.0.0.1', {
  username: 'username',
  password: 'password',
});
var bucket = cluster.bucket('default');
var coll = bucket.defaultCollection();



const blk = blockDevice('./mnt/4gb', {
  uid: 1000,
  gid: 1000,
  options: process.getuid() ? [] : [ 'allow_other' ],
  read (index, cnt, buf, cb) {
    const payloadPromises = []
    for (let i = 0; i < cnt; i++) {
      payloadPromises.push(coll.get(index+i).then(result=>{
        if (!result) {
          return blk.EMPTY
        }
        return result
      }).then(b=>b.copy(buf, i * 512)).then(()=>{
          coll.upsert(`volumeName-block-${index+i}`,b)
      }))
    }
    Promise.all(payloadPromises).then(()=>cb(null))
  },
  write (index, cnt, buf, cb) {
    const payloadPromises = []
    for (let i = 0; i < cnt; i++) {
      payloadPromises.push(coll.get(index+i).then(result=>{
        if (!result) {
          return Buffer.alloc(512)
        }
        return result
      }).then(b=>buf.copy(b, 0, i * 512)).then(()=>{
          coll.upsert(`volumeName-block-${index+i}`,b)
      }))
    }
    Promise.all(payloadPromises).then(()=>cb(null))
  },
  mount () {
    console.log('device mounted')
  },
  error (err) {
    console.log('error', err)
  }
})

let max = 0
setInterval(function () {
  if (max === blocks.size) return
  max = blocks.size
  console.log('Total bytes: ' + blocks.size * 512)
}, 1000)

process.once('SIGINT', () => blk.close())
