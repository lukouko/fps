// @ts-ignore
import * as assets from 'fps/assets';

let texturesLookup;

export const loadTextures = async () => {
  if (texturesLookup) {
    throw new Error('Textures have already been loaded!');
  }

  const textureLoadPromises = Object.entries(assets)
    .map(([id, assetPath]) =>
      new Promise((resolve) => {
        const assetImage = new Image();
        assetImage.onload = () => resolve({ id, image: assetImage });
        assetImage.src = assetPath;
      }),
    );
  
  const textures = await Promise.all(textureLoadPromises);
  
  texturesLookup = textures.reduce((acc, { id, image }) => {
    acc[id] = image;
    return acc;
  }, {});
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