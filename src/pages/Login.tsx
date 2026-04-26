import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Try to sign in first
      const { error: signInError } = await signInWithEmail(email, password);

      if (signInError) {
        // If the error isn't "Invalid login credentials", we should show the exact error (e.g., Email not confirmed)
        if (!signInError.message.includes('Invalid login credentials')) {
          toast.error(signInError.message);
          setLoading(false);
          return;
        }

        // 2. If we got "Invalid login credentials", it means either:
        //    a) The user doesn't exist
        //    b) The user exists, but typed the wrong password
        
        // Let's attempt to auto sign them up!
        const { error: signUpError } = await signUpWithEmail(email, password);
        
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
             // Ah! The user DID exist! So the original "Invalid login credentials" meant wrong password.
             toast.error('Incorrect password for this email address.');
          } else {
             toast.error(`Sign up failed: ${signUpError.message}`);
          }
          setLoading(false);
          return;
        }

        // If sign up succeeded, we are logged in!
        toast.success('Account auto-created successfully! Welcome.');
        navigate(from, { replace: true });
        return;
      }

      // If sign in succeeded
      toast.success('Signed in successfully');
      navigate(from, { replace: true });

    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      if (loading) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-medium tracking-tight">
              Researcher Publication Platform
            </h1>
            <p className="text-muted-foreground">
              Automate your academic publication workflow
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl font-medium">
              Welcome
            </CardTitle>
            <CardDescription>
              Enter your email and password. If you don't have an account, we'll magically create one for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 6 characters required.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  'Please wait...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted-foreground/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={async () => {
                setLoading(true);
                await signInWithGoogle();
                setLoading(false);
              }}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Secure authentication powered by Supabase
          </p>
          <p className="text-xs">
            Your credentials are encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  );
}
