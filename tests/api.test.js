import chai from 'chai';
import chaiHttp from 'chai-http';
import server from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('api Endpoints', () => {
  // Test data
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };
  let authToken;
  let testFileId;

  it('should GET /status return the status of the services', () =>
    new Promise((done) => {
      chai
        .request(server)
        .get('/status')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal({ redis: true, db: true });
          done();
        });
    }));

  it('should GET /stats return the number of users and files', (done) => {
    chai
      .request(server)
      .get('/stats')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('users');
        expect(res.body).to.have.property('files');
        done();
      });
  });

  it('should POST /users create a new user', (done) => {
    chai
      .request(server)
      .post('/users')
      .send(testUser)
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.have.property('email', testUser.email);
        expect(res.body).to.have.property('id');
        done();
      });
  });

  it('should GET /connect sign in the user and return a token', (done) => {
    chai
      .request(server)
      .get('/connect')
      .auth(testUser.email, testUser.password)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('token');
        authToken = res.body.token;
        done();
      });
  });

  it('should GET /users/me return the authenticated user', (done) => {
    chai
      .request(server)
      .get('/users/me')
      .set('x-token', authToken)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('email', testUser.email);
        done();
      });
  });

  it('should POST /files upload a new file', (done) => {
    chai
      .request(server)
      .post('/files')
      .set('x-token', authToken)
      .send({
        name: 'test.txt',
        type: 'file',
        data: 'SGVsbG8gV29ybGQ=', // "Hello World" in Base64
      })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.have.property('name', 'test.txt');
        testFileId = res.body.id;
        done();
      });
  });

  it('should GET /files/:id retrieve a specific file', (done) => {
    chai
      .request(server)
      .get(`/files/${testFileId}`)
      .set('x-token', authToken)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('name', 'test.txt');
        done();
      });
  });

  it('should GET /files retrieve a list of files', (done) => {
    chai
      .request(server)
      .get('/files')
      .set('x-token', authToken)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('array');
        done();
      });
  });

  it('should PUT /files/:id/publish publish a file', (done) => {
    chai
      .request(server)
      .put(`/files/${testFileId}/publish`)
      .set('x-token', authToken)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('isPublic', true);
        done();
      });
  });

  it('should GET /files/:id/data retrieve file content', (done) => {
    chai
      .request(server)
      .get(`/files/${testFileId}/data`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.equal('Hello World');
        done();
      });
  });

  it('should GET /disconnect sign out the user', (done) => {
    chai
      .request(server)
      .get('/disconnect')
      .set('x-token', authToken)
      .end((err, res) => {
        expect(res).to.have.status(204);
        done();
      });
  });
});
