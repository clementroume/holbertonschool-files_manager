import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  it('should be alive when connected', (done) => {
    setTimeout(() => {
      expect(redisClient.isAlive()).to.be.true;
      done();
    }, 1000);
  });

  it('should set and get a value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should delete a value', async () => {
    await redisClient.set('test_key_del', 'test_value', 10);
    await redisClient.del('test_key_del');
    const value = await redisClient.get('test_key_del');
    expect(value).to.be.null;
  });

  it('should handle key expiration', (done) => {
    redisClient.set('test_key_exp', 'test_value', 1);
    setTimeout(async () => {
      const value = await redisClient.get('test_key_exp');
      expect(value).to.be.null;
      done();
    }, 2000);
  }).timeout(3000);
});
