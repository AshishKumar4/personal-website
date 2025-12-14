import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const techStack = [
  { name: 'Python', icon: 'python', color: '#3776AB' },
  { name: 'TypeScript', icon: 'typescript', color: '#3178C6' },
  { name: 'Rust', icon: 'rust', color: '#CE422B' },
  { name: 'C++', icon: 'cplusplus', color: '#00599C' },
  { name: 'React', icon: 'react', color: '#61DAFB' },
  { name: 'Next.js', icon: 'nextdotjs', color: '#000000' },
  { name: 'Tailwind', icon: 'tailwindcss', color: '#06B6D4' },
  { name: 'Node.js', icon: 'nodedotjs', color: '#339933' },
  { name: 'PyTorch', icon: 'pytorch', color: '#EE4C2C' },
  { name: 'TensorFlow', icon: 'tensorflow', color: '#FF6F00' },
  { name: 'Docker', icon: 'docker', color: '#2496ED' },
  { name: 'Git', icon: 'git', color: '#F05032' },
  { name: 'Linux', icon: 'linux', color: '#FCC624' },
  { name: 'AWS', icon: 'amazonwebservices', color: '#FF9900' },
  { name: 'Cloudflare', icon: 'cloudflare', color: '#F38020' },
];

export function TechStackSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      id="tech"
      className="py-24 md:py-32"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-accent text-xl md:text-2xl mr-3">02.</span> Tech Stack
        </h2>
        <div className="mt-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 md:gap-8">
          {techStack.map((tech, index) => (
            <motion.div
              key={tech.name}
              className="group flex flex-col items-center gap-2"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : index * 0.05 }}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-lg bg-card border border-border transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-glow group-hover:scale-110">
                <img
                  src={`https://cdn.simpleicons.org/${tech.icon}/${tech.color.replace('#', '')}`}
                  alt={tech.name}
                  className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <span className="text-xs md:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {tech.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
