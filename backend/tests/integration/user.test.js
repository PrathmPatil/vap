import { expect } from 'chai';
import request from 'supertest';

import app from '../../src/index.js';

describe('App APIs Test', () => {
  describe('GET /vap/welcome', () => {
    it('returns the welcome message', async () => {
      const res = await request(app).get('/vap/welcome');

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.include('Welcome');
    });
  });
});
