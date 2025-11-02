import React from 'react';
import { motion } from 'framer-motion';
import { PROFESSIONAL_EXPERIENCE } from '@/components/config/constants';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
export function ExperienceSection() {
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
          {PROFESSIONAL_EXPERIENCE.map((exp, index) => (
            <motion.div
              key={exp.company}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-light-navy border-lightest-navy/20 hover:shadow-lg hover:shadow-green/10 transition-shadow duration-300">
                <CardHeader className="flex flex-row items-start gap-4">
                  <img src={exp.logoUrl} alt={`${exp.company} logo`} className="w-10 h-10 rounded-full mt-1 bg-white p-1" />
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
          ))}
        </div>
      </div>
    </motion.section>
  );
}