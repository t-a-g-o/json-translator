/// <reference types="../global" />
import 'openai/shims/node';
import nock from 'nock';
import { plaintranslate } from '../core/translator';
import { DeepLTranslateLanguages } from '../modules/languages';
import { getProviderLanguageCode } from '../modules/helpers';
import { TranslationConfig, TranslationModules } from '../modules/modules';
import { default_concurrency_limit, default_fallback } from '../utils/micro';

describe('TRANSLATOR', () => {
  it('maps simplified Chinese to the Bing provider language code', () => {
    expect(getProviderLanguageCode('bing', 'zh-CN')).toBe('zh-Hans');
    expect(getProviderLanguageCode('google', 'zh-CN')).toBe('zh-CN');
  });

  it('does not call the provider for text without letters', async () => {
    global.totalTranslated = 0;
    const translate = jest.fn();
    const config: TranslationConfig = {
      moduleKey: 'google',
      TranslationModule: {
        ...TranslationModules.google,
        translate,
      },
      concurrencyLimit: default_concurrency_limit,
      fallback: default_fallback,
      cacheEnabled: false,
    };

    const result = await plaintranslate(config, '123 -- !', 'en', 'fr', []);

    expect(result).toBe('123 -- !');
    expect(translate).not.toHaveBeenCalled();
    expect(global.totalTranslated).toBe(1);
  });

  it('should translate using DeepL', async function() {
    process.env.DEEPL_API_KEY = 'deepl_api_key';

    const scope = nock('https://api-free.deepl.com', {
      reqheaders: {
        authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'content-type': 'application/json',
      },
    })
      .post('/v2/translate', {
        text: ['hello'],
        target_lang: DeepLTranslateLanguages.German,
        source_lang: DeepLTranslateLanguages.English,
      })
      .reply(200, {
        translations: [
          {
            detected_source_language: 'EN',
            text: 'hallo',
          },
        ],
      });

    let config: TranslationConfig = {
      moduleKey: 'deepl',
      TranslationModule: TranslationModules['deepl'],
      concurrencyLimit: default_concurrency_limit,
      fallback: default_fallback,
      cacheEnabled: false,
    };

    const result = await plaintranslate(
      config,
      'hello',
      DeepLTranslateLanguages.English,
      DeepLTranslateLanguages.German,
      []
    );
    expect(result).toEqual('hallo');
    scope.done();
  });
});
