function isEspeakLanguageEnabledByDefault(espeakLangInfo) {
    switch (espeakLangInfo.identifier) {
        // Redundant.
        //
        // Don't enable these languages by default because
        // they duplicatea a language provided by Google's engine.
        case "inc/hi":  // Hindi
        case "poz/id":  // Indonesian
        case "gmw/nl":  // Dutch
        case "ko":  // Korean
        case "roa/it":  // Italian
        case "roa/fr-BE":  // French (Belgium)
        case "roa/fr-CH":  // French (Switzerland)
        case "roa/fr":  // French (France)
        case "roa/es":  // Spanish (Spain)
        case "roa/es-419":  // Spanish (Latin America)
        case "roa/pt":  // Portuguese (Portugal)
        case "roa/pt-BR":  // Portuguese (Brazil)
        case "gmw/de":  // German
        case "gmw/en-029":  // English (Caribbean)
        case "gmw/en":  // English (Great Britain)
        case "gmw/en-GB-scotland":  // English (Scotland)
        case "gmw/en-GB-x-gbclan":  // English (Lancaster)
        case "gmw/en-GB-x-gbcwmd":  // English (West Midlands)
        case "gmw/en-GB-x-rp":  // English (Received Pronunciation)
        case "gmw/en-US":  // English (America)
            return false;

        // Allowed languages.
        case "gmw/af":  // Afrikaans
        case "sem/am":  // Amharic
        case "roa/an":  // Aragonese
        case "sem/ar":  // Arabic
        case "inc/as":  // Assamese
        case "trk/az":  // Azerbaijani
        case "zls/bg":  // Bulgarian
        case "inc/bn":  // Bengali
        case "inc/bpy":  // Bishnupriya Manipuri
        case "zls/bs":  // Bosnian
        case "roa/ca":  // Catalan
        case "sit/cmn":  // Chinese (Mandarin)
        case "zlw/cs":  // Czech
        case "cel/cy":  // Welsh
        case "gmq/da":  // Danish
        case "grk/el":  // Greek
        case "art/eo":  // Esperanto
        case "urj/et":  // Estonian
        case "eu":  // Basque
        case "ira/fa":  // Persian
        case "ira/fa-Latn":  // Persian (Pinglish)
        case "urj/fi":  // Finnish
        case "cel/ga":  // Gaelic (Irish)
        case "cel/gd":  // Gaelic (Scottish)
        case "sai/gn":  // Guarani
        case "grk/grc":  // Greek (Ancient)
        case "inc/gu":  // Gujarati
        case "sit/hak":  // Hakka Chinese
        case "zls/hr":  // Croatian
        case "urj/hu":  // Hungarian
        case "ine/hy":  // Armenian (East Armenia)
        case "ine/hyw":  // Armenian (West Armenia)
        case "art/ia":  // Interlingua
        case "gmq/is":  // Icelandic
        case "jpx/ja":  // Japanese
        case "art/jbo":  // Lojban
        case "ccs/ka":  // Georgian
        case "esx/kl":  // Greenlandic
        case "dra/kn":  // Kannada
        case "inc/kok":  // Konkani
        case "ira/ku":  // Kurdish
        case "trk/ky":  // Kyrgyz
        case "itc/la":  // Latin
        case "art/lfn":  // Lingua Franca Nova
        case "bat/lt":  // Lithuanian
        case "bat/lv":  // Latvian
        case "poz/mi":  // Māori
        case "zls/mk":  // Macedonian
        case "dra/ml":  // Malayalam
        case "inc/mr":  // Marathi
        case "poz/ms":  // Malay
        case "sem/mt":  // Maltese
        case "sit/my":  // Myanmar (Burmese)
        case "gmq/nb":  // Norwegian Bokmål
        case "azc/nci":  // Nahuatl (Classical)
        case "inc/ne":  // Nepali
        case "cus/om":  // Oromo
        case "inc/or":  // Oriya
        case "inc/pa":  // Punjabi
        case "roa/pap":  // Papiamento
        case "zlw/pl":  // Polish
        case "roa/ro":  // Romanian
        case "zle/ru":  // Russian
        case "inc/sd":  // Sindhi
        case "inc/si":  // Sinhala
        case "zlw/sk":  // Slovak
        case "zls/sl":  // Slovenian
        case "ine/sq":  // Albanian
        case "zls/sr":  // Serbian
        case "gmq/sv":  // Swedish
        case "bnt/sw":  // Swahili
        case "dra/ta":  // Tamil
        case "dra/te":  // Telugu
        case "bnt/tn":  // Setswana
        case "trk/tr":  // Turkish
        case "trk/tt":  // Tatar
        case "inc/ur":  // Urdu
        case "aav/vi":  // Vietnamese (Northern)
        case "aav/vi-VN-x-central":  // Vietnamese (Central)
        case "aav/vi-VN-x-south":  // Vietnamese (Southern)
        case "sit/yue":  // Chinese (Cantonese)
            return true;
    }

    console.error('Language ' + espeakLangInfo.identifier +
                  ' (' + espeakLangInfo.name + ') should be handled ' +
                  'in switch.');
}

function isEspeakLanguageEnabled(langInfo, callback) {
    var defaultValue = isEspeakLanguageEnabledByDefault(langInfo);

    var key = langInfo.identifier;
    chrome.storage.local.get(key, (function(result) {
        callback(result[key] !== undefined ? result[key] : defaultValue);
    }).bind(this));
}
