import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Uden — Work Operating System',
    short_name: 'Uden',
    description: 'Give Uden the outcome. It plans, executes, verifies, and keeps the work trail durable.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#12110f',
    theme_color: '#12110f',
    orientation: 'any',
    categories: ['productivity', 'business', 'utilities'],
    icons: [
      { src: '/uden-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
}
