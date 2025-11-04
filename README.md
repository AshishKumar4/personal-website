# CodePrint: Ashish Kumar Singh's Portfolio

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/AshishKumar4/personal-website)

> A visually stunning and interactive personal portfolio with a 'blueprint' theme, showcasing projects, experience, and a future-planned blog. CodePrint is designed with a modern 'blueprint' aesthetic, featuring a sophisticated dark theme, subtle animated grid background, and smooth, fluid transitions powered by Framer Motion.

## ✨ Key Features

*   **Modern & Minimalist Design:** A sophisticated dark theme with a unique 'blueprint' aesthetic.
*   **Interactive & Animated:** Smooth, fluid animations and micro-interactions powered by Framer Motion.
*   **Dynamic Project Showcase:** Fetches and displays real-time GitHub repository statistics (stars, forks).
*   **Fully Responsive:** Meticulously crafted for a seamless experience on all devices, from mobile to desktop.
*   **Built for Performance:** Serverless architecture on Cloudflare Pages and Workers for a fast, global user experience.
*   **Scalable Backend:** Ready for future expansion with a blog and admin panel powered by Cloudflare Durable Objects.

## 🛠️ Technology Stack

*   **Frontend:** [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
*   **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/), [Hono](https://hono.dev/)
*   **Storage:** [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/)

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [Bun](https://bun.sh/) package manager
*   A [Cloudflare account](https://dash.cloudflare.com/sign-up)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/codeprint-portfolio.git
    cd codeprint-portfolio
    ```

2.  **Install dependencies:**
    This project uses Bun for package management.
    ```sh
    bun install
    ```

## 💻 Development

To start the local development server, which includes both the Vite frontend and the Hono backend worker, run:

```sh
bun dev
```

This will start the Vite development server, typically on `http://localhost:3000`. The server is configured to proxy API requests from `/api/*` to the local Cloudflare Worker instance, enabling seamless full-stack development.

## ☁️ Deployment

This project is designed for one-click deployment to Cloudflare.

You can deploy directly by clicking the button below:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/AshishKumar4/personal-website)

Alternatively, you can deploy using the Wrangler CLI after setting up your Cloudflare account.

1.  **Login to Wrangler:**
    ```sh
    bunx wrangler login
    ```

2.  **Build and deploy the application:**
    The `deploy` script in `package.json` handles the build and deployment process.
    ```sh
    bun deploy
    ```

This command will build the React application and deploy it along with the Worker to your Cloudflare account.

## 📂 Project Structure

The codebase is organized into three main directories:

-   `src/`: Contains the frontend React application, including pages, components, hooks, and styles.
-   `worker/`: Contains the backend Cloudflare Worker code, built with Hono. This is where API routes and Durable Object logic reside.
-   `shared/`: Contains shared code, primarily TypeScript types, used by both the frontend and the backend to ensure type safety.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.