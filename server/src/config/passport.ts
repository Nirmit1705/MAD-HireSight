import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { TokenUtils } from '../utils/authUtils';

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email: profile.emails?.[0]?.value },
        });

        if (user) {
          // User exists, update Google ID if not set
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
          }
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName || '',
              googleId: profile.id,
              isVerified: true, // Google accounts are pre-verified
            },
          });
        }

        const tokens = TokenUtils.generateTokenPair(user.id, user.email, user.name);
        
        // Create a user object with tokens attached
        const userWithTokens = {
          ...user,
          tokens
        } as any;
        
        return done(null, userWithTokens);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
