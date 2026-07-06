import { expect } from 'chai';
import { logout } from '../../src/services/userService.js';

describe('User service', () => {
  describe('logout', () => {
    it('returns a successful logout response', () => {
      const res = {
        statusCode: null,
        payload: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.payload = payload;
          return this;
        }
      };

      logout({}, res);

      expect(res.statusCode).to.equal(200);
      expect(res.payload).to.deep.equal({
        success: true,
        message: 'Logout successful'
      });
    });
  });
});
