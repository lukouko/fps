// @ts-ignore
import { images as imageAssets} from './assets';
import * as Types from './types';

/** @type Object<string, Types.Texture> */
let texturesLookup;

/**
 * Loads all of the assets as textures and stores them in a cache for later access
 * @param {Object} params
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {Promise<undefined>}
 */
export const loadTextures = async ({ displayInfo }) => {
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
      const repeatedImage = await createRepeatedImage({ baseImage, displayInfo });
      texturesLookup[`${id}-repeatable`] = repeatedImage;
    }*/
  });

  await Promise.all(textureLoadPromises);
  return;
};

/**
 * Creates a new Image object from the given path.
 * @param {Object} params
 * @param {string} params.assetPath The path to the image. Can be a base64 encoded iamge path.
 * @returns {Promise<HTMLImageElement>}
 */
const loadImageFromPath = ({ assetPath }) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.src = assetPath;
});

/*const createRepeatedImage = async ({ baseImage, displayInfo }) => {
  const repeatingImageCanvas = document.createElement('canvas');

  const targetWidth = baseImage.width * 10;
  const targetHeight = baseImage.width * ((Math.ceil(displayInfo.halfScreenHeightFloored) / baseImage.width));

  repeatingImageCanvas.width = targetWidth;
  repeatingImageCanvas.height = targetHeight;

  const repeatingImageCanvasContext = repeatingImageCanvas.getContext('2d');
  const repeatingImagePattern = repeatingImageCanvasContext.createPattern(baseImage, 'repeat');
  repeatingImageCanvasContext.fillStyle = repeatingImagePattern;
  repeatingImageCanvasContext.fillRect(0, 0, repeatingImageCanvas.width, repeatingImageCanvas.height);

  const repeatingImage = await loadImageFromPath({ assetPath: repeatingImageCanvas.toDataURL() });
  return repeatingImage;
};*/

/**
 * Returns the texture matching the passed id.
 * @param {Object} params
 * @param {Types.TextureId} params.id
 * @returns {Types.Texture}
 */
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