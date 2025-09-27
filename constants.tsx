
import React from 'react';

export const POKEMON_CLASSES: { [key: number]: string } = {
  1: 'pikachu',
  2: 'charizard',
  3: 'bulbasaur',
  4: 'mewtwo',
};

export const STATUS_COLORS = {
  target: {
    border: 'border-green-500',
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    ring: 'ring-green-500',
  },
  protected: {
    border: 'border-red-500',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    ring: 'ring-red-500',
  },
  neutral: {
    border: 'border-gray-500',
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    ring: 'ring-gray-500',
  },
};

export const ICONS = {
  upload: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  ),
  crosshairs: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
    </svg>
  ),
  lock: (props: React.SVGProps<SVGSVGElement>) => (
     <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  target: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a16.957 16.957 0 0 1 4.18-5.84m-4.18 5.84-4.18-5.84m0 0a16.957 16.957 0 0 1-4.18-5.84m4.18 5.84L9.75 14.37m0 0A16.957 16.957 0 0 1 5.57 8.53m0 0a16.957 16.957 0 0 0-1.33-5.84m1.33 5.84L5.57 14.37m0 0a6 6 0 0 1-5.84-7.38m5.84 2.56L5.57 8.53m0 0a16.957 16.957 0 0 0-4.18-5.84m4.18 5.84L9.75 8.53" />
    </svg>
  )
};
