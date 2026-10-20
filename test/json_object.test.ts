import 'openai/shims/node';
import { deepDiver } from '../src/core/json_object';
import { plaintranslate } from '../src/core/translator';
import { TranslationConfig } from '../src/modules/modules';

declare global {
  var totalTranslation: number;
  var totalTranslated: number;
  var skipInCache: number;
}

jest.mock('../src/core/translator', () => ({
  plaintranslate: jest.fn(),
}));

const mockedPlaintranslate = plaintranslate as jest.Mock;

describe('deepDiver', () => {
  beforeEach(() => {
    mockedPlaintranslate.mockReset();
    mockedPlaintranslate.mockResolvedValue('translated');
    global.totalTranslation = 0;
    global.totalTranslated = 0;
    global.skipInCache = 0;
  });

  it('reuses nested translations and translates only missing values', async () => {
    const object = {
      data: {
        account: {
          existing: 'Hello',
          missing: 'Welcome',
        },
      },
    };
    const oldTranslation = {
      data: {
        account: {
          existing: 'Hola',
          missing: '',
        },
      },
    };
    const config = {
      moduleKey: 'bing',
      TranslationModule: {
        name: 'Bing',
        altName: 'Bing',
        languages: {},
        translate: jest.fn(),
      },
      concurrencyLimit: 10,
      fallback: false,
      cacheEnabled: false,
    } as TranslationConfig;

    const result = await deepDiver(
      config,
      object,
      'en',
      'es',
      oldTranslation
    );

    expect(result?.data.account).toEqual({
      existing: 'Hola',
      missing: 'translated',
    });
    expect(mockedPlaintranslate).toHaveBeenCalledTimes(1);
    expect(mockedPlaintranslate).toHaveBeenCalledWith(
      config,
      'Welcome',
      'en',
      'es',
      [],
      {}
    );
    expect(global.totalTranslation).toBe(1);
  });
});
