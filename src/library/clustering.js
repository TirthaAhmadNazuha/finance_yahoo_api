import cluster from 'cluster';

class CreateCluster {
  constructor(workerFunction, workerDatasOrNumWorker = 1) {
    this.workerFunction = workerFunction;
    this.workerDatasOrNumWorker = workerDatasOrNumWorker;
  }

  start() {
    if (cluster.isPrimary) {
      console.log(`Starting primary, create ${this.workerDatasOrNumWorker} workers`);
      if (this.workerDatasOrNumWorker instanceof Array) {
        for (const workerData of this.workerDatasOrNumWorker) {
          cluster.fork({ workerData });
        }
      } else {
        for (let i = 0; i < this.workerDatasOrNumWorker; i++) {
          cluster.fork();
        }
      }

      cluster.on('message', (worker, msg) => {
        console.log(`i get message from worker ${worker.process.pid}: ${msg}`);
      });
    } else this.workerFunction();
  }
}

export default CreateCluster;
