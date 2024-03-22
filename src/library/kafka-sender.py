from kafka import KafkaProducer
import json
config = json.loads(input('config'))
producer = KafkaProducer(bootstrap_servers=config['broker'])
while True:
    job = input('produce')
    if job == 'exit': break
    producer.send(config['topic'], value=str.encode(job))

producer.flush()
print('closed')
