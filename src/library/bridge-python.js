import { spawn } from 'child_process';


export class KafkaProducer {
  constructor(broker, topic) {
    this.proc = spawn('python', ['library/kafka-sender.py']);
    this.closed = false;
    this.proc.stdout.on('data', (msg) => {
      msg = msg.toString();
      if (msg == 'closed') this.closed = true;
    });
    this.proc.on('error', (err) => console.error(err));
    this.proc.stdin.write(`${JSON.stringify({ broker, topic })}\n`);
  }

  send(message) {
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
  }

  flush() {
    this.proc.stdin.write(`exit\n`);
    return new Promise((r) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        r();
      }, 10000);
      const interval = setInterval(() => {
        if (this.closed == true) {
          clearTimeout(timeout);
          clearInterval(interval);
          r();
        }
      }, 100);
    });
  }
}


// (async () => {
//   const kafka = new KafkaProducer(['kafka01.research.ai', 'kafka03.research.ai', 'kafka02.research.ai'], 'test');
//   kafka.send({ test: 'yee' });
//   setTimeout(() => {
//     kafka.flush();
//   }, 2000);
// })();
