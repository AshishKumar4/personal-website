import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

export function ContactSection() {
  const prefersReducedMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSending(true);
    try {
      await api('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      toast.success('Message sent! I\'ll get back to you soon.');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.section
      id="contact"
      className="py-24 md:py-32"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display">
          Get In Touch
        </h2>
        <p className="mt-4 text-muted-foreground">
          Have a question or want to work together? Drop me a message!
        </p>
        <form onSubmit={handleSubmit} className="mt-10 space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={sending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to say?"
              rows={5}
              required
              disabled={sending}
            />
          </div>
          <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.section>
  );
}
