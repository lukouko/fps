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

  const textureLoadPromises = imageAssets.map(async ({ id, assetPath, isRepeatable, isSprite }) => {
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

    if (isSprite) {
      const scaledTextures = await createScaledTextures({ baseImage });
      scaledTextures.forEach(({ label, texture}) => {
        texturesLookup[`${id}-${label}`] = texture;
      });
    }
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

const createScaledTextures = async ({ baseImage }) => {
  const scales = [];
  for (let i = 5; i < 100; i += 1) {
    scales.push({ label: `${i}`, scale: i / 100 });
  }

  const scaledImagePromises = scales.map(async ({ label, scale }) => {
    const width = Math.floor(baseImage.width * scale);
    const height = Math.floor(baseImage.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const canvasContext = canvas.getContext('2d');
    canvasContext.drawImage(baseImage, 0, 0, width, height);

    const scaledImage = await loadImageFromPath({ assetPath: canvas.toDataURL() });

    const imageData = canvasContext.getImageData(0, 0, width, height);
    const pixelBuffer = imageData.data;

    return {
      label,
      texture: {
        baseImage: scaledImage,
        canvas,
        canvasContext,
        imageData,
        pixelBuffer,
        bytesPerRow: 4 * width,
        width: width,
        height: height,
      },
    };
  });

  const scaledTextures = await Promise.all(scaledImagePromises);
  return scaledTextures;
};

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

/**
 * Returns an array of TextureIds representing all of the textures available.
 * 
 * @returns {Array<Types.TextureId>}
 */
export const getTextureIds = () => {
  return Object.keys(texturesLookup);
};