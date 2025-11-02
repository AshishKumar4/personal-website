import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Experience } from '@shared/types';
import { api } from '@/lib/api-client';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
export function ExperienceSection() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const response = await api<{ items: Experience[] }>('/api/experiences');
        setExperiences(response.items);
      } catch (error) {
        console.error("Failed to fetch experiences:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExperiences();
  }, []);
  return (
    <motion.section
      id="experience"
      className="py-24 md:py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-green text-xl md:text-2xl mr-3">02.</span> Where I’ve Worked
        </h2>
        <div className="mt-12 space-y-8">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="bg-light-navy border-lightest-navy/20">
                <CardHeader className="flex flex-row items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-full mt-1 bg-dark-navy" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-6 w-3/4 bg-dark-navy" />
                    <Skeleton className="h-4 w-1/2 bg-dark-navy" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full bg-dark-navy" />
                  <Skeleton className="h-4 w-5/6 bg-dark-navy mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            experiences.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-light-navy border-lightest-navy/20 hover:shadow-lg hover:shadow-green/10 transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <img src={exp.logoUrl} alt={`${exp.company} logo`} className="w-10 h-10 rounded-full mt-1 bg-white p-1 object-contain" />
                    <div>
                      <CardTitle className="text-lg font-bold text-lightest-slate">{exp.role} @ <span className="text-green">{exp.company}</span></CardTitle>
                      <p className="text-sm font-mono text-light-slate">{exp.duration}</p>
                      <p className="text-xs font-mono text-slate">{exp.location}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-light-slate mb-4">{exp.description}</CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {exp.skills.map(skill => (
                        <span key={skill} className="bg-green-tint text-green text-xs font-mono px-2 py-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}