import Jackd from 'jackd'

class BeanstalkdClient {

    use(tubename) {
        this.tubename = tubename
    }

    async putWithFastConnect(...jobs) {
        if (!this.tubename) throw new Error('Tube name required')
        const beanstalkd = new Jackd()
        await beanstalkd.connect({ host: '192.168.20.106', port: 11300 })
        await beanstalkd.use(this.tubename)
        for (const job of jobs) {
            await beanstalkd.put(job)
        }
        await beanstalkd.disconnect()
    }
}

const beanstalkdClient = new BeanstalkdClient()
export default beanstalkdClient