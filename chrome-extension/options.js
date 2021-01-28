// Copyright 2018 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

/**
 * @fileoverview Options page for the eSpeak text-to-speech extension.
 */

'use strict';

function $(id) {
  return document.getElementById(id);
}

/**
 * @constructor
 */
var EspeakTtsOptions = function() {
  chrome.runtime.getBackgroundPage((background) => {
    this.engine_ = background.engine;
    this.engine_.getLangInfoArray((langInfoArray) => {
      this.langInfoArray_ = langInfoArray;
      this.init();
    });
  });
};

EspeakTtsOptions.prototype.init = function() {
  this.langInfoArray_.forEach((function(langInfo) {
                                var row = document.createElement('div');
                                row.className = 'option';
                                var label = document.createElement('label');
                                row.appendChild(label);
                                var checkbox = document.createElement('input');
                                checkbox.id = langInfo.identifier;
                                checkbox.type = 'checkbox';
                                checkbox.className = 'checkbox pref';
                                label.appendChild(checkbox);
                                var text = document.createElement('span');
                                text.innerText = langInfo.name;
                                label.appendChild(text);
                                $('languages').appendChild(row);
                              }).bind(this));

  this.update();

  document.addEventListener('change', this.onChange.bind(this), false);

  // Schedule this for after the updates above are done. This is guaranteed to
  // run after them.
  setTimeout(this.ensureLastVoiceUnremovable.bind(this), 0);
};

EspeakTtsOptions.prototype.update = function() {
  this.langInfoArray_.forEach((function(langInfo) {
                                isEspeakLanguageEnabled(
                                    langInfo, function(enabled) {
                                      var key = langInfo.identifier;
                                      $(key).checked = enabled;
                                    });
                              }).bind(this));
};

EspeakTtsOptions.prototype.onChange = function(event) {
  var target = event.target;
  if (target.tagName != 'INPUT' || target.className != 'checkbox pref') return;

  var obj = {};
  var key = 'lang-enabled-' + target.id;
  obj[key] = target.checked;
  chrome.storage.local.set(obj);
  console.log('updating voices');
  this.engine_.updateVoices();

  this.ensureLastVoiceUnremovable();
};

EspeakTtsOptions.prototype.ensureLastVoiceUnremovable = function() {
  // If there's only one voice left, disable it from being unchecked. Otherwise,
  // enable them all.
  const checkedNodes = document.querySelectorAll('.checkbox:checked');
  const shouldDisable = checkedNodes.length == 1;
  for (let i = 0; i < checkedNodes.length; i++) {
    checkedNodes[i].disabled = shouldDisable;
  }
};

function addTranslatedMessagesToDom() {
  var elts = root.querySelectorAll('*[msgid]');
  for (var i = 0; i < elts.length; i++) {
    var msgid = elts[i].getAttribute('msgid');
    if (!msgid) {
      throw new Error('Element has no msgid attribute: ' + elts[i]);
    }
    elts[i].textContent = chrome.i18n.getMessage(msgid);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var options = new EspeakTtsOptions();
}, false);
