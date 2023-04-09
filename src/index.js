const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

const initialise = () => {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  // Get the 2D rendering context of the canvas
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No context found');
  }

  console.log('Loaded');
  
};

initialise();