import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { saveToken } from '@/lib/auth';
import { LoginResponse } from '@shared/types';
export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api<LoginResponse>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      saveToken(response.token);
      toast.success('Login successful!');
      navigate('/admin');
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <PortfolioLayout>
      <AnimatedGridBackground />
      <main className="relative z-10 flex items-center justify-center min-h-screen py-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-sm bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-lightest-slate font-display">Admin Login</CardTitle>
              <CardDescription className="text-slate">Enter your credentials to access the dashboard.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-light-slate">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-light-slate">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-green text-dark-navy hover:bg-green/90" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}