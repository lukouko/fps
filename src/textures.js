// @ts-ignore
import { images as imageAssets} from 'fps/assets';
//import { findLowestCommonMultipleOf } from './helpers';
//import * as constants from './constants';

let texturesLookup;

export const loadTextures = async () => {
  if (texturesLookup) {
    throw new Error('Textures have already been loaded!');
  }

  texturesLookup = {};
  const bytesPerPixel = 4;

  const textureLoadPromises = imageAssets.map(async ({ id, assetPath, isRepeatable }) => {
    const baseImage = await loadImageFromPath({ assetPath });

    const canvas = document.createElement('canvas');		
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      throw new Error(`Failed to create 2d canvas context for texture '${id}'`);
    }

    canvasContext.drawImage(baseImage, 0, 0);
    
    const imageData = canvasContext.getImageData(0, 0, baseImage.width, baseImage.height);
    const pixelBuffer = imageData.data;

    texturesLookup[id] = {
      baseImage,
      canvas,
      canvasContext,
      imageData,
      pixelBuffer,
      bytesPerRow: bytesPerPixel * baseImage.width,
      width: baseImage.width,
      height: baseImage.height,
    };

    /*if (isRepeatable) {
      const repeatedImage = await createRepeatedImage({ baseImage });
      texturesLookup[`${id}-repeatable`] = repeatedImage;
    }*/
  });

  await Promise.all(textureLoadPromises);
};

const loadImageFromPath = ({ assetPath }) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.src = assetPath;
});

/*const createRepeatedImage = async ({ baseImage }) => {
  const repeatingImageCanvas = document.createElement('canvas');

  const targetWidth = baseImage.width * 10;
  const targetHeight = baseImage.width * ((Math.ceil(constants.HALF_SCREEN_HEIGHT_FLOORED) / baseImage.width));

  repeatingImageCanvas.width = targetWidth;
  repeatingImageCanvas.height = targetHeight;

  const repeatingImageCanvasContext = repeatingImageCanvas.getContext('2d');
  const repeatingImagePattern = repeatingImageCanvasContext.createPattern(baseImage, 'repeat');
  repeatingImageCanvasContext.fillStyle = repeatingImagePattern;
  repeatingImageCanvasContext.fillRect(0, 0, repeatingImageCanvas.width, repeatingImageCanvas.height);

  const repeatingImage = await loadImageFromPath({ assetPath: repeatingImageCanvas.toDataURL() });
  return repeatingImage;
};*/

export const getTextureById = ({ id }) => {
  if (!texturesLookup) {
    throw new Error('Cannot get texture prior to texture loading');
  }

  const texture = texturesLookup[id];
  if (!texture) {
    throw new Error(`Failed to get texture with id '${id}', available ids are ${Object.keys(texturesLookup).join(', ')}`);
  }

  return texture;
};