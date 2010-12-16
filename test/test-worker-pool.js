var assert = require('assert')

var WorkerPool = require('../index').worker_pool.WorkerPool;

exports['test basic functionallity'] = function(beforeExit) {
  var n = 0;
  var worker_pool = new WorkerPool(5, __dirname + '/fixtures/pool-worker.js');
  var results = [ 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ];
  var timeout = 1000;

  setTimeout(function() {
    worker_pool.terminate();
  }, 6000);

  worker_pool.on('ready', function() {
    n++;

    for (var i = 1; i <= 10; i++) {
      (function(i) {
        var worker_msg = { 'number': i, 'return_after': 0 };

        worker_pool.run_in_pool(worker_msg, { 'timeout': timeout }, function(err, worker) {
          if (!err) {
            n++;

            worker.addListener('result', function(result) {
              n++;
              assert.ok(result.result == results[i - 1], 'result equal');
            });

            worker.addListener('error', function(err) {
              assert.fail('worker ' + i + ' emitted error: ' + err.message);
            });

            worker.addListener('timeout', function() {
              assert.fail('emitted timeout');
            });
          }
          else {
            assert.fail('run_in_pool returned error: ' + err.message)
          }
        });
      }(i));
    }
  });

  beforeExit(function() {
    assert.equal(n, 1 + 10 + 10);
  });
};

exports['test pool resize'] = function(beforeExit) {
  var n = 0;
  var worker_pool = new WorkerPool(5, __dirname + '/fixtures/pool-worker.js');

  worker_pool.on('ready', function() {
    n++;

    assert.equal(5, worker_pool.get_size());

    setTimeout(function() {
      n++;
      worker_pool.resize_pool(20);

      assert.equal(20, worker_pool.get_size());
    }, 1000);

    setTimeout(function() {
      n++;
      worker_pool.resize_pool(3);

      assert.equal(3, worker_pool.get_size());
    }, 4000);

    setTimeout(function() {
      n++;
      worker_pool.terminate();
    }, 6000);
  });

  beforeExit(function() {
    assert.equal(n, 4);
  });
};

exports['test pool terminate'] = function(beforeExit) {
  var n = 0;
  var worker_pool = new WorkerPool(5, __dirname + '/fixtures/pool-worker.js');

  worker_pool.on('ready', function() {
    n++;

    assert.equal(5, worker_pool.get_size());
    worker_pool.terminate();
    assert.equal(0, worker_pool.get_size());

    setTimeout(function() {
      var timeout = 1000;
      var worker_msg = { 'number': 1, 'return_after': 0 };
      worker_pool.run_in_pool(worker_msg, { 'timeout': timeout }, function(err, worker) {
        if (!err) {
          worker.addListener('result', function(result) {
            assert.fail('emitted result: ' + result);
          });

          worker.addListener('error', function(err) {
            assert.fail('emitted error' + err.message);
          });

          worker.addListener('timeout', function() {
            assert.fail('emitted timeout');
          });
        }
        else {
          n++;

          assert.ok('run_in_pool returned error: ' + err.message);
          assert.match(err.message, /worker pool has been terminated/i);
        }
      });
    }, 2000);

    setTimeout(function() {
      n++;
      worker_pool.resize_pool(20);
      assert.equal(0, worker_pool.get_size());
    });
  });

  beforeExit(function() {
    assert.equal(n, 3);
  });
};

exports['test worker timeout'] = function(beforeExit) {
  var n = 0;
  var worker_pool = new WorkerPool(5, __dirname + '/fixtures/pool-worker.js');

  worker_pool.on('ready', function() {
    n++;

    var timeout = 2000;
    var worker_msg = { 'number': 1, 'return_after': 10000 };
    worker_pool.run_in_pool(worker_msg, { 'timeout': timeout }, function(err, worker) {
      if (!err) {
        n++;

        worker.addListener('result', function(result) {
          assert.fail('emitted result: ' + result);
        });

        worker.addListener('error', function(err) {
          assert.fail('emitted error' + err.message);
        });

        worker.addListener('timeout', function() {
          n++;

          assert.ok('emitted timeout');

          setTimeout(function() {
            // Make sure that the pool size is ensured
            n++;
            assert.equal(5, worker_pool.get_size());

            worker_pool.terminate();
          }, 2000);
        });
      }
      else {
        assert.fail('run_in_pool returned error: ' + err.message)
      }
    });
  });

  beforeExit(function() {
    assert.equal(n, 4);
  });
};

exports['test worker error'] = function(beforeExit) {
  var n = 0;
  var worker_pool = new WorkerPool(5, __dirname + '/fixtures/pool-worker.js');

  worker_pool.on('ready', function() {
    n++;

    var timeout = 10000;
    var worker_msg = { 'number': 1, 'return_after': 0, 'throw_error': true };
    worker_pool.run_in_pool(worker_msg, { 'timeout': timeout }, function(err, worker) {
      if (!err) {
        n++;

        worker.addListener('result', function(result) {
          assert.fail('emitted result: ' + result);
        });

        worker.addListener('error', function(err) {
          n++;
          assert.ok('emitted error' + err.message);
          assert.match(err.message, /worker thrown an error/i);

          worker_pool.terminate();
        });
      }
      else {
        assert.fail('run_in_pool returned error: ' + err.message)
      }
    });
  });

  beforeExit(function() {
    assert.equal(n, 3);
  });
};
