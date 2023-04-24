// @ts-ignore
import { images as imageAssets} from 'fps/assets';
import { findLowestCommonMultipleOf } from './helpers';
import * as constants from './constants';

let texturesLookup;

export const loadTextures = async () => {
  if (texturesLookup) {
    throw new Error('Textures have already been loaded!');
  }

  texturesLookup = {};
  const textureLoadPromises = imageAssets.map(async ({ id, assetPath, isRepeatable }) => {
    const baseImage = await loadImageFromPath({ assetPath });
    texturesLookup[id] = baseImage;

    if (isRepeatable) {
      const repeatedImage = await createRepeatedImage({ baseImage });
      texturesLookup[`${id}-repeatable`] = repeatedImage;
    }
  });

  await Promise.all(textureLoadPromises);
};

const loadImageFromPath = ({ assetPath }) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.src = assetPath;
});

const createRepeatedImage = async ({ baseImage }) => {
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
};

export const getTextureImageById = ({ id }) => {
  if (!texturesLookup) {
    throw new Error('Cannot get texture prior to texture loading');
  }

  const textureImage = texturesLookup[id];
  if (!textureImage) {
    throw new Error(`Failed to get texture with id '${id}', available ids are ${Object.keys(texturesLookup).join(', ')}`);
  }

  return textureImage;
};