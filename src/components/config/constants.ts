import { Github, Linkedin, Twitter } from 'lucide-react';
export const PERSONAL_INFO = {
  name: "Ashish Kumar Singh",
  nameLines: ["Ashish", "Kumar", "Singh"],
  title: "Systems Engineer · ML Researcher",
  email: "ashishkmr472@gmail.com",
  profilePicture: "/portrait-640.webp",
  portrait: "/portrait-1200.webp",
  site: "https://ashishkumarsingh.com",
  github: "AshishKumar4",
};
export const SOCIAL_LINKS = [
  {
    name: "GitHub",
    handle: "AshishKumar4",
    url: "https://github.com/ashishkumar4",
    Icon: Github,
  },
  {
    name: "LinkedIn",
    handle: "aksnip",
    url: "https://www.linkedin.com/in/aksnip/",
    Icon: Linkedin,
  },
  {
    name: "X",
    handle: "@ashishkmr472",
    url: "https://x.com/ashishkmr472",
    Icon: Twitter,
  },
];
export const SECTIONS = [
  { id: "about", label: "Model card", nav: "About" },
  { id: "work", label: "Training run", nav: "Work" },
  { id: "projects", label: "Samples", nav: "Projects" },
  { id: "writing", label: "Notes", nav: "Writing" },
  { id: "contact", label: "Condition", nav: "Contact" },
];
