import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Star, GitFork, ExternalLink } from 'lucide-react';
import { GitHubRepo, Project } from '@shared/types';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const ProjectCard = ({ name, description, repo, url, imageUrl, prefersReducedMotion }: Project & { prefersReducedMotion: boolean }) => {
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRepoData = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (response.ok) {
          const data = await response.json();
          setRepoData({
            stars: data.stargazers_count,
            forks: data.forks_count,
          });
        } else if (response.status === 403) {
          console.warn("GitHub API rate limited");
          setError(true);
        }
      } catch (error) {
        console.error("Failed to fetch GitHub repo data:", error);
        setError(true);
      }
    };
    if (repo) {
      fetchRepoData();
    }
  }, [repo]);

  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { y: -8 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col justify-between transition-all duration-300 hover:border-primary/50 hover:shadow-lg overflow-hidden">
        {imageUrl && (
          <div className="relative aspect-video overflow-hidden">
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <CardHeader className={imageUrl ? 'pt-4' : ''}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{name}</CardTitle>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors duration-300"
                aria-label={`View ${name} on GitHub`}
              >
                <ExternalLink size={20} />
              </a>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <CardDescription>{description}</CardDescription>
          </CardContent>
        </div>
        <CardFooter>
          {repoData ? (
            <div className="flex items-center space-x-4 text-sm font-mono text-muted-foreground">
              <div className="flex items-center">
                <Star size={16} className="mr-1 text-primary" aria-hidden="true" />
                <span aria-label={`${repoData.stars} stars`}>{repoData.stars}</span>
              </div>
              <div className="flex items-center">
                <GitFork size={16} className="mr-1 text-primary" aria-hidden="true" />
                <span aria-label={`${repoData.forks} forks`}>{repoData.forks}</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-xs text-muted-foreground font-mono">Stats unavailable</div>
          ) : (
            <div className="h-5 w-20"></div> // Placeholder for alignment
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api<{ items: Project[] }>('/api/projects');
        setProjects(response.items);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <motion.section
      id="projects"
      className="py-24 md:py-32"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-accent text-xl md:text-2xl mr-3">04.</span> Things I've Built
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="h-full flex flex-col justify-between">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6 mt-2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-5 w-20" />
                </CardFooter>
              </Card>
            ))
          ) : (
            projects.map((project, index) => (
               <motion.div
                key={project.id}
                initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : index * 0.1 }}
                className="h-full"
              >
                <ProjectCard {...project} prefersReducedMotion={prefersReducedMotion} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
