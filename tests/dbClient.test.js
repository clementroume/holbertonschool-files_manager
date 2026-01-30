import { expect } from 'chai';
import dbClient from '../utils/db';

describe('dbClient', () => {
  it('should be alive when connected', (done) => {
    setTimeout(() => {
      expect(dbClient.isAlive()).to.be.true;
      done();
    }, 1000);
  });

  it('should return the number of users', async () => {
    const userCount = await dbClient.nbUsers();
    expect(userCount).to.be.a('number');
  });

  it('should return the number of files', async () => {
    const fileCount = await dbClient.nbFiles();
    expect(fileCount).to.be.a('number');
  });
});
