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
  const { signInWithEmail, signUpWithEmail } = useAuth();
  
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
