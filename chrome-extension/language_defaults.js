// Copyright 2018 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

/**
 * @fileoverview Provides some functions to determine which eSpeak
 * languages are available by default. This can be changed by the
 * user by going to the extension options page.
 */

function isEspeakLanguageEnabledByDefault(espeakLangInfo) {
  switch (espeakLangInfo.identifier) {
    // Redundant.
    //
    // Don't enable these languages by default because
    // they duplicatea a language provided by Google's engine.
    case "inc/hi":  // Hindi
    case "gmw/nl":  // Dutch
    case "roa/fr-BE":  // French (Belgium)
    case "roa/fr-CH":  // French (Switzerland)
    case "roa/fr":  // French (France)
    case "roa/es":  // Spanish (Spain)
    case "roa/es-419":  // Spanish (Latin America)
    case "roa/pt":  // Portuguese (Portugal)
    case "roa/pt-BR":  // Portuguese (Brazil)
    case "gmw/en-029":  // English (Caribbean)
    case "gmw/en":  // English (Great Britain)
    case "gmw/en-GB-scotland":  // English (Scotland)
    case "gmw/en-GB-x-gbclan":  // English (Lancaster)
    case "gmw/en-GB-x-gbcwmd":  // English (West Midlands)
    case "gmw/en-GB-x-rp":  // English (Received Pronunciation)
    case "gmw/en-US":  // English (America)
    case "jpx/ja":  // Japanese. Disable by default due to voice quality.
      return false;

    // These languages are not supported by Chrome OS UI,
    // so don't include them by default.
    case "gmw/af":  // Afrikaans
    case "sem/am":  // Amharic
    case "roa/an":  // Aragonese
    case "inc/as":  // Assamese
    case "trk/az":  // Azerbaijani
    case "zls/bs":  // Bosnian
    case "inc/bpy":  // Bishnupriya Manipuri
    case "grk/grc":  // Greek (Ancient)
    case "art/eo":  // Esperanto
    case "eu":  // Basque
    case "ira/fa-Latn":  // Persian (Pinglish)
    case "cel/ga":  // Gaelic (Irish)
    case "cel/gd":  // Gaelic (Scottish)
    case "sai/gn":  // Guarani
    case "sit/hak":  // Hakka Chinese
    case "ine/hy":  // Armenian (East Armenia)
    case "ine/hyw":  // Armenian (West Armenia)
    case "art/ia":  // Interlingua
    case "gmq/is":  // Icelandic
    case "art/jbo":  // Lojban
    case "ccs/ka":  // Georgian
    case "esx/kl":  // Greenlandic
    case "inc/kok":  // Konkani
    case "ira/ku":  // Kurdish
    case "trk/ky":  // Kyrgyz
    case "itc/la":  // Latin
    case "art/lfn":  // Lingua Franca Nova
    case "poz/mi":  // Māori
    case "zls/mk":  // Macedonian
    case "sem/mt":  // Maltese
    case "sit/my":  // Myanmar (Burmese)
    case "azc/nci":  // Nahuatl (Classical)
    case "inc/ne":  // Nepali
    case "cus/om":  // Oromo
    case "inc/or":  // Oriya
    case "inc/pa":  // Punjabi
    case "roa/pap":  // Papiamento
    case "inc/sd":  // Sindhi
    case "inc/si":  // Sinhala
    case "ine/sq":  // Albanian
    case "gmq/sv":  // Swedish
    case "bnt/tn":  // Setswana
    case "trk/tt":  // Tatar
    case "inc/ur":  // Urdu
    case "cel/cy":  // Welsh
    case "aav/vi-VN-x-central":  // Vietnamese (Central)
    case "aav/vi-VN-x-south":  // Vietnamese (Southern)
    case "sit/yue":  // Chinese (Cantonese)
    case "roa/ht":  // Haitian Creole
    case "zle/ru-LV":  // Russian (Latvia)
    case "tai/shn":  // Shan (Tai Yai)
      return false;

    // Allowed languages. All of these are supported by Chrome OS UI
    // but not provided by default by Google's TTS.
    case "sem/ar":  // Arabic
    case "zls/bg":  // Bulgarian
    case "inc/bn":  // Bengali (written as Bangla in Chrome's UI)
    case "roa/ca":  // Catalan
    case "sit/cmn": // Chinese (Mandarin)
    case "zls/hr":  // Croatian
    case "zlw/cs":  // Czech
    case "gmq/da":  // Danish
    case "urj/et":  // Estonian
    case "urj/fi":  // Finnish
    case "gmw/de":  // German
    case "grk/el":  // Greek
    case "inc/gu":  // Gujarati
    case "urj/hu":  // Hungarian
    case "poz/id":  // Indonesian
    case "roa/it":  // Italian
    case "dra/kn":  // Kannada
    case "ko":  // Korean
    case "bat/lv":  // Latvian
    case "bat/lt":  // Lithuanian
    case "poz/ms":  // Malay
    case "dra/ml":  // Malayalam
    case "inc/mr":  // Marathi
    case "gmq/nb":  // Norwegian Bokmål
    case "ira/fa":  // Persian
    case "zlw/pl":  // Polish
    case "roa/ro":  // Romanian
    case "zle/ru":  // Russian
    case "zls/sr":  // Serbian
    case "zlw/sk":  // Slovak
    case "zls/sl":  // Slovenian
    case "bnt/sw":  // Swahili
    case "dra/ta":  // Tamil
    case "dra/te":  // Telugu
    case "trk/tr":  // Turkish
    case "aav/vi":  // Vietnamese (Northern)
      return true;
  }

  console.error('Language ' + espeakLangInfo.identifier +
          ' (' + espeakLangInfo.name + ') should be handled ' +
          'in switch.');
}

function isEspeakLanguageEnabled(langInfo, callback) {
  var defaultValue = isEspeakLanguageEnabledByDefault(langInfo);

  var key = 'lang-enabled-' + langInfo.identifier;
  chrome.storage.local.get(key, (function(result) {
    callback(result[key] !== undefined ? result[key] : defaultValue);
  }).bind(this));
}
