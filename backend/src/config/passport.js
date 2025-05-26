const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: GitHubStrategy } = require('passport-github2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      // ユーザーが存在しない（またはセッションが無効）場合、セッションを破棄
      return done(null, false, { message: "セッションが無効です。再度ログインしてください。" });
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      }
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id }
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          googleId: profile.id,
          isEmailVerified: true, // Google emails are verified
          role: 'MEMBER' // Default role
        }
      });
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
}));

// GitHub OAuth strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/auth/github/callback`,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Get primary email
    const email = profile.emails.find(email => email.primary)?.value || profile.emails[0].value;

    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { githubId: profile.id },
          { email }
        ]
      }
    });

    if (user) {
      // Update GitHub ID if not set
      if (!user.githubId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { githubId: profile.id }
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.displayName.split(' ')[0],
          lastName: profile.displayName.split(' ').slice(1).join(' ') || '',
          githubId: profile.id,
          isEmailVerified: true, // GitHub emails are verified
          role: 'MEMBER' // Default role
        }
      });
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
}));

/* セッションの有効期限を明示的に設定（例：30日） */
passport.session({ maxAge: 30 * 24 * 60 * 60 * 1000 }); 