import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/users/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Here you usually find or create user in DB

        const user = {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
        };

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;