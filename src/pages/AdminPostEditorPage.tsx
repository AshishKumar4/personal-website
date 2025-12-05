import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PostEditor } from '@/components/editor/PostEditor';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { BlogPost } from '@shared/types';
import { Loader2 } from 'lucide-react';

export function AdminPostEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | undefined>();
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (slug) {
      const fetchPost = async () => {
        try {
          const data = await api<BlogPost>(`/api/posts/${slug}`);
          setPost(data);
        } catch (err: any) {
          setError(err?.message || 'Failed to load post');
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => navigate('/admin/posts')}
            className="mt-4 text-primary hover:underline"
          >
            Back to Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <PostEditor initialPost={post} slug={slug} />
    </div>
  );
}
