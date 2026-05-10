import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await resetPasswordForEmail(email);
      setSubmitted(true);
      toast.success('Password reset link sent to your email.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20">
                <KeyRound className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">Reset Password</CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          
          {submitted ? (
            <CardContent className="pb-6">
              <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-sm text-zinc-300">
                If an account exists with <span className="font-semibold text-zinc-100">{email}</span>, you will receive a password reset link shortly.
              </div>
              <div className="mt-6 flex justify-center">
                <Link to="/login" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-4">
                <Button type="submit" className="w-full" isLoading={loading}>
                  Send Reset Link
                </Button>
                <Link to="/login" className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
