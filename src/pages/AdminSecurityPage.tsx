import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type PasswordFormData = z.infer<typeof passwordSchema>;
export function AdminSecurityPage() {
  const [loading, setLoading] = useState(false);
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    const token = getToken();
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      toast.success('Password changed successfully.');
      form.reset();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-lightest-slate font-display">Security</h1>
      <Card className="bg-light-navy border-lightest-navy/20 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lightest-slate">Change Password</CardTitle>
          <CardDescription className="text-slate">
            Update your administrator password.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-light-slate">Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-light-slate">New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-light-slate">Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="bg-green text-dark-navy hover:bg-green/90">
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}