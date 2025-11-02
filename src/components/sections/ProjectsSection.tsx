import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KEY_PROJECTS } from '@/components/config/constants';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Star, GitFork, ExternalLink } from 'lucide-react';
import { GitHubRepo } from '@shared/types';
const ProjectCard = ({ name, description, repo, url }: { name: string; description: string; repo: string; url: string; }) => {
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
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
        }
      } catch (error) {
        console.error("Failed to fetch GitHub repo data:", error);
      }
    };
    fetchRepoData();
  }, [repo]);
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="h-full"
    >
      <Card className="bg-light-navy border-lightest-navy/20 h-full flex flex-col justify-between hover:border-green/50 transition-colors duration-300">
        <div>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-lightest-slate group-hover:text-green transition-colors duration-300">{name}</CardTitle>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-slate hover:text-green transition-colors duration-300">
                <ExternalLink size={20} />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-light-slate">{description}</CardDescription>
          </CardContent>
        </div>
        <CardFooter>
          {repoData && (
            <div className="flex items-center space-x-4 text-sm font-mono text-slate">
              <div className="flex items-center">
                <Star size={16} className="mr-1 text-green" />
                <span>{repoData.stars}</span>
              </div>
              <div className="flex items-center">
                <GitFork size={16} className="mr-1 text-green" />
                <span>{repoData.forks}</span>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};
export function ProjectsSection() {
  return (
    <motion.section
      id="projects"
      className="py-24 md:py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-green text-xl md:text-2xl mr-3">03.</span> Things I’ve Built
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KEY_PROJECTS.map((project, index) => (
             <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-full"
            >
              <ProjectCard {...project} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}