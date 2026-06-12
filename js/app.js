/**
 * iTerm2-web Application v2.0
 *
 * Unified encoder/decoder supporting iTerm2 and Sixel protocols.
 * Features: batch operations, encryption, timing display, settings persistence.
 */

'use strict';

var App = (function () {
  // State
  var encoderFiles = [];
  var encoderFramebuffer = null;
  var lastEncodedData = null;
  var lastEncodedFormat = null;
  var batchEncodeResults = [];
  var batchDecodeResults = [];
  var pendingDecryptCallback = null;

  // Settings persistence
  var STORAGE_KEY = 'termpix-settings';

  var defaultSettings = {
    format: 'iterm2',
    maxWidth: 800,
    maxHeight: 600,
    bg: '#000000',
    noResize: false,
    colors: 256,
    quantize: 'median-cut',
    dither: 'fs',
    decodeFormat: 'auto'
  };

  function loadSettings() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return Object.assign({}, defaultSettings);
  }

  function saveSettings() {
    var s = {
      format: document.getElementById('encoder-format').value,
      maxWidth: parseInt(document.getElementById('encoder-width').value, 10),
      maxHeight: parseInt(document.getElementById('encoder-height').value, 10),
      bg: document.getElementById('encoder-bg').value,
      noResize: document.getElementById('encoder-no-resize').checked,
      colors: parseInt(document.getElementById('encoder-colors').value, 10),
      quantize: document.getElementById('encoder-quantize').value,
      dither: document.getElementById('encoder-dither').value,
      decodeFormat: document.getElementById('decoder-format').value
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function applySettings() {
    var s = loadSettings();
    document.getElementById('encoder-format').value = s.format;
    document.getElementById('encoder-width').value = s.maxWidth;
    document.getElementById('encoder-height').value = s.maxHeight;
    document.getElementById('encoder-bg').value = s.bg;
    document.getElementById('encoder-no-resize').checked = s.noResize;
    document.getElementById('encoder-colors').value = s.colors;
    document.getElementById('colors-value').textContent = s.colors;
    document.getElementById('encoder-quantize').value = s.quantize;
    document.getElementById('encoder-dither').value = s.dither;
    document.getElementById('decoder-format').value = s.decodeFormat;
    // Trigger format change to show/hide Sixel options
    document.getElementById('encoder-format').dispatchEvent(new Event('change'));
  }

  // ============================================================
  // Init
  // ============================================================
  function init() {
    applyLanguage();
    applySettings();
    bindTabs();
    bindEncoder();
    bindDecoder();
    bindModal();
  }

  // ============================================================
  // Tabs
  // ============================================================
  function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabName = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
      });
    });
  }

  // ============================================================
  // Encoder
  // ============================================================
  function bindEncoder() {
    // Format change -> show/hide Sixel options
    document.getElementById('encoder-format').addEventListener('change', function () {
      var isSixel = this.value === 'sixel';
      document.getElementById('sixel-options').style.display = isSixel ? 'block' : 'none';
      saveSettings();
    });

    // Colors slider
    document.getElementById('encoder-colors').addEventListener('input', function () {
      document.getElementById('colors-value').textContent = this.value;
    });
    document.getElementById('encoder-colors').addEventListener('change', saveSettings);

    // Settings change -> save
    document.getElementById('encoder-width').addEventListener('change', saveSettings);
    document.getElementById('encoder-height').addEventListener('change', saveSettings);
    document.getElementById('encoder-bg').addEventListener('change', saveSettings);
    document.getElementById('encoder-no-resize').addEventListener('change', saveSettings);
    document.getElementById('encoder-quantize').addEventListener('change', saveSettings);
    document.getElementById('encoder-dither').addEventListener('change', saveSettings);
    document.getElementById('decoder-format').addEventListener('change', saveSettings);

    // Encrypt checkbox
    document.getElementById('encoder-encrypt').addEventListener('change', function () {
      document.getElementById('password-row').style.display = this.checked ? 'flex' : 'none';
    });

    // File input
    document.getElementById('encoder-file').addEventListener('change', function (e) {
      encoderFiles = Array.from(e.target.files);
      if (encoderFiles.length > 0) loadPreview(encoderFiles[0]);
    });

    // URL load
    document.getElementById('encoder-load-url').addEventListener('click', function () {
      var url = document.getElementById('encoder-url').value.trim();
      if (url) {
        ImageLoader.loadFromURL(url).then(function (fb) {
          encoderFramebuffer = fb;
          updatePreview(fb);
          updateInfo(url, fb);
        }).catch(function (err) { showToast(t('toast_load_image') + ': ' + err.message, 'error'); });
      }
    });

    // Paste
    document.getElementById('encoder-paste').addEventListener('click', function () {
      ImageLoader.loadFromClipboard().then(function (fb) {
        encoderFramebuffer = fb;
        updatePreview(fb);
        updateInfo('Clipboard', fb);
      }).catch(function (err) { showToast(t('toast_load_image'), 'error'); });
    });

    // Drag & drop
    var dropZone = document.getElementById('encoder-drop');
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        encoderFiles = Array.from(e.dataTransfer.files);
        loadPreview(encoderFiles[0]);
      }
    });

    // Password buttons
    document.getElementById('toggle-password').addEventListener('click', function () {
      var input = document.getElementById('encoder-password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('gen-password').addEventListener('click', function () {
      var pwd = SixelCrypto.generatePassword(16);
      document.getElementById('encoder-password').value = pwd;
      document.getElementById('encoder-password').type = 'text';
      navigator.clipboard.writeText(pwd).then(function () {
        showToast(t('toast_password_generated'), 'success');
      });
    });

    document.getElementById('copy-password').addEventListener('click', function () {
      var pwd = document.getElementById('encoder-password').value;
      if (pwd) {
        navigator.clipboard.writeText(pwd).then(function () {
          showToast(t('toast_copied'), 'success');
        });
      }
    });

    // Encode button
    document.getElementById('encoder-encode').addEventListener('click', function () { encodeSingle(); });
    document.getElementById('encoder-batch').addEventListener('click', function () { encodeBatch(); });
    document.getElementById('encoder-copy').addEventListener('click', function () { copyOutput(); });
    document.getElementById('encoder-export').addEventListener('click', function () { exportOutput(); });
    document.getElementById('encoder-batch-zip').addEventListener('click', function () { downloadZip(batchEncodeResults, 'encode'); });
  }

  function loadPreview(file) {
    ImageLoader.loadFromFile(file).then(function (fb) {
      encoderFramebuffer = fb;
      updatePreview(fb);
      updateInfo(file.name, fb);
    }).catch(function (err) { showToast(t('toast_load_image'), 'error'); });
  }

  function updatePreview(fb) {
    var canvas = document.getElementById('encoder-preview');
    var srcCanvas = fb.toCanvas();
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    canvas.getContext('2d').drawImage(srcCanvas, 0, 0);
  }

  function updateInfo(source, fb) {
    document.getElementById('encoder-info').textContent =
      source + ' | ' + fb.width + 'x' + fb.height + ' ' + t('info_dimensions');
  }

  function getEncodeOptions() {
    return {
      format: document.getElementById('encoder-format').value,
      maxWidth: parseInt(document.getElementById('encoder-width').value, 10),
      maxHeight: parseInt(document.getElementById('encoder-height').value, 10),
      backgroundColor: hexToRgb(document.getElementById('encoder-bg').value),
      noResize: document.getElementById('encoder-no-resize').checked,
      maxColors: parseInt(document.getElementById('encoder-colors').value, 10),
      quantizeAlgorithm: document.getElementById('encoder-quantize').value,
      ditherMode: document.getElementById('encoder-dither').value,
      encrypt: document.getElementById('encoder-encrypt').checked,
      password: document.getElementById('encoder-password').value
    };
  }

  async function encodeOne(fb, opts) {
    var startTime = performance.now();
    var result;

    if (opts.format === 'iterm2') {
      var iterm2Result = await ITerm2Encoder.encodeITerm2(fb, {
        maxWidth: opts.maxWidth,
        maxHeight: opts.maxHeight,
        backgroundColor: opts.backgroundColor,
        noResize: opts.noResize
      });
      result = {
        data: new TextEncoder().encode(iterm2Result.sequence),
        text: iterm2Result.sequence,
        width: iterm2Result.width,
        height: iterm2Result.height,
        size: iterm2Result.size
      };
    } else {
      // Sixel
      var targetFb = fb.clone();
      targetFb.alphaComposeBackground(opts.backgroundColor);

      if (!opts.noResize) {
        var target = Scaler.calculateScaleToFit(targetFb.width, targetFb.height, opts.maxWidth, opts.maxHeight, { cellX: 1, cellY: 1 });
        targetFb = Scaler.resizeBilinear(targetFb, target.width, target.height);
      }

      var rgba = targetFb.getRawData();
      var w = targetFb.width, h = targetFb.height;

      // Quantize
      var quantResult;
      if (opts.quantizeAlgorithm === 'pnn') {
        quantResult = Quantize.pnnQuant(rgba, w, h, opts.maxColors);
      } else {
        quantResult = Quantize.medianCut(rgba, w, h, opts.maxColors);
      }

      // Dither
      var pixels = quantResult.pixels;
      if (opts.ditherMode === 'fs') {
        pixels = Dither.applyFloydSteinberg(rgba, pixels, quantResult.palette, w, h);
      } else if (opts.ditherMode === 'bayer') {
        var dithered = Dither.applyBayerDither(rgba, w, h, 255.0 / opts.maxColors);
        if (opts.quantizeAlgorithm === 'pnn') {
          quantResult = Quantize.pnnQuant(dithered, w, h, opts.maxColors);
        } else {
          quantResult = Quantize.medianCut(dithered, w, h, opts.maxColors);
        }
        pixels = quantResult.pixels;
      }

      var sixelBytes = SixelEncoder.encodeSixel(pixels, quantResult.palette, w, h);
      result = {
        data: sixelBytes,
        text: new TextDecoder('latin1').decode(sixelBytes),
        width: w,
        height: h,
        size: sixelBytes.length
      };
    }

    // Encrypt if needed
    if (opts.encrypt && opts.password) {
      result.data = await SixelCrypto.encryptData(result.data, opts.password);
      result.encrypted = true;
    }

    result.elapsed = performance.now() - startTime;
    return result;
  }

  async function encodeSingle() {
    if (!encoderFramebuffer) {
      showToast(t('toast_load_image'), 'error');
      return;
    }

    var opts = getEncodeOptions();
    var statusEl = document.getElementById('encoder-timing');
    statusEl.style.display = 'block';
    statusEl.innerHTML = t('timing_encode') + ': ...';

    try {
      var result = await encodeOne(encoderFramebuffer, opts);

      lastEncodedData = result.data;
      lastEncodedFormat = opts.format;

      document.getElementById('encoder-output').textContent = result.text;
      statusEl.innerHTML = '<strong>' + t('timing_encode') + ': ' + formatTime(result.elapsed) + '</strong>' +
        ' | ' + result.width + 'x' + result.height + ' | ' + result.size + ' ' + t('bytes') +
        (result.encrypted ? ' | 🔒 encrypted' : '');

      showToast(t('toast_batch_done'), 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function encodeBatch() {
    if (encoderFiles.length === 0 && !encoderFramebuffer) {
      showToast(t('toast_load_image'), 'error');
      return;
    }

    var files = encoderFiles.length > 0 ? encoderFiles : [];
    if (files.length === 0) {
      // Single file mode
      encodeSingle();
      return;
    }

    var opts = getEncodeOptions();
    var progressEl = document.createElement('progress');
    progressEl.max = files.length;
    progressEl.value = 0;

    var batchList = document.getElementById('encoder-batch-list');
    batchList.innerHTML = '';
    document.getElementById('encoder-batch-results').style.display = 'block';
    document.getElementById('encoder-batch-info').textContent = '0 / ' + files.length;

    batchEncodeResults = [];
    var totalStart = performance.now();

    for (var i = 0; i < files.length; i++) {
      try {
        var fb = await ImageLoader.loadFromFile(files[i]);
        var result = await encodeOne(fb, opts);
        result.filename = files[i].name + (opts.format === 'iterm2' ? '.iterm2' : '.sixel') + (opts.encrypt ? '.enc' : '');

        batchEncodeResults.push(result);

        var item = document.createElement('div');
        item.className = 'batch-item';
        item.innerHTML = '<div class="batch-item-name">' + files[i].name + '</div>' +
          '<div class="batch-item-info">' + result.width + 'x' + result.height + ' | ' + result.size + ' ' + t('bytes') + '</div>' +
          '<div class="batch-item-timing">' + formatTime(result.elapsed) + '</div>';
        batchList.appendChild(item);
      } catch (err) {
        var errItem = document.createElement('div');
        errItem.className = 'batch-item error';
        errItem.innerHTML = '<div class="batch-item-name">' + files[i].name + '</div>' +
          '<div class="batch-item-error">' + err.message + '</div>';
        batchList.appendChild(errItem);
      }

      document.getElementById('encoder-batch-info').textContent = (i + 1) + ' / ' + files.length;
    }

    var totalElapsed = performance.now() - totalStart;
    document.getElementById('batch-encode-timing') || document.getElementById('encoder-batch-results');
    var timingDiv = document.getElementById('encoder-batch-results').querySelector('.timing') || document.createElement('div');
    timingDiv.className = 'timing';
    timingDiv.innerHTML = '<strong>' + t('timing_batch') + ': ' + formatTime(totalElapsed) + '</strong>';
    if (!document.getElementById('encoder-batch-results').querySelector('.timing')) {
      document.getElementById('encoder-batch-results').appendChild(timingDiv);
    }

    showToast(t('toast_batch_done'), 'success');
  }

  function copyOutput() {
    var text = document.getElementById('encoder-output').textContent;
    if (!text) { showToast(t('toast_nothing'), 'error'); return; }
    navigator.clipboard.writeText(text).then(function () {
      showToast(t('toast_copied'), 'success');
    });
  }

  function exportOutput() {
    if (!lastEncodedData) { showToast(t('toast_nothing'), 'error'); return; }
    var ext = lastEncodedFormat === 'iterm2' ? '.iterm2' : '.sixel';
    downloadBlob(lastEncodedData, 'encoded' + ext);
    showToast(t('toast_exported'), 'success');
  }

  // ============================================================
  // Decoder
  // ============================================================
  function bindDecoder() {
    // File input
    document.getElementById('decoder-file').addEventListener('change', function (e) {
      var files = Array.from(e.target.files);
      if (files.length === 1) {
        readFileAsText(files[0]).then(function (text) {
          document.getElementById('decoder-input').value = text;
        });
      } else if (files.length > 1) {
        decodeBatchFiles(files);
      }
    });

    // Decode button
    document.getElementById('decoder-decode').addEventListener('click', function () { decodeSingle(); });
    document.getElementById('decoder-batch').addEventListener('click', function () {
      var files = Array.from(document.getElementById('decoder-file').files);
      if (files.length > 0) {
        decodeBatchFiles(files);
      } else {
        showToast(t('toast_load_image'), 'error');
      }
    });

    // Export buttons
    document.getElementById('decoder-download-png').addEventListener('click', function () { exportDecoded('png'); });
    document.getElementById('decoder-download-jpeg').addEventListener('click', function () { exportDecoded('jpeg'); });
    document.getElementById('decoder-batch-zip').addEventListener('click', function () { downloadZip(batchDecodeResults, 'decode'); });
  }

  function detectFormat(text) {
    var format = document.getElementById('decoder-format').value;
    if (format !== 'auto') return format;

    if (text.indexOf('\x1b]1337;File=') >= 0 || text.indexOf('\\x1b]1337;File=') >= 0) return 'iterm2';
    if (text.indexOf('\x1bP') >= 0 || text.indexOf('\x90') >= 0) return 'sixel';

    // Check if it's encrypted
    var bytes = new TextEncoder().encode(text);
    if (SixelCrypto.isEncrypted(bytes)) return 'encrypted';

    return 'unknown';
  }

  async function decodeSingle() {
    var input = document.getElementById('decoder-input').value;
    if (!input) { showToast(t('toast_paste_required'), 'error'); return; }

    var statusEl = document.getElementById('decoder-timing');
    statusEl.style.display = 'block';
    statusEl.innerHTML = t('timing_decode') + ': ...';

    try {
      var startTime = performance.now();
      var result = await decodeData(input);
      result.elapsed = performance.now() - startTime;

      displayDecodedResult(result);
      statusEl.innerHTML = '<strong>' + t('timing_decode') + ': ' + formatTime(result.elapsed) + '</strong>' +
        ' | ' + result.width + 'x' + result.height;

      showToast(t('toast_decode_done'), 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function decodeData(input) {
    var format = detectFormat(input);
    var data = new TextEncoder().encode(input);

    // Handle encrypted data
    if (format === 'encrypted' || SixelCrypto.isEncrypted(data)) {
      var password = await promptPassword();
      if (!password) throw new Error('Password required');
      data = await SixelCrypto.decryptData(data, password);
      input = new TextDecoder().decode(data);
      format = detectFormat(input);
    }

    // Unescape if needed
    if (input.indexOf('\\x1b]1337;File=') >= 0) {
      input = input.replace(/\\x1b/g, '\x1b').replace(/\\x07/g, '\x07');
    }

    if (format === 'iterm2') {
      var parsed = iTerm2Decoder.decodeSequence(input);
      if (!parsed) throw new Error('Invalid iTerm2 sequence');
      var canvas = await iTerm2Decoder.decodeToCanvas(input);
      return { canvas: canvas, width: canvas.width, height: canvas.height, format: 'iterm2' };
    } else if (format === 'sixel') {
      var decoded = SixelDecoder.decodeSixel(input);
      var canvas2 = document.createElement('canvas');
      canvas2.width = decoded.width;
      canvas2.height = decoded.height;
      canvas2.getContext('2d').putImageData(new ImageData(decoded.pixels, decoded.width, decoded.height), 0, 0);
      return { canvas: canvas2, width: decoded.width, height: decoded.height, format: 'sixel' };
    } else {
      throw new Error('Unknown format');
    }
  }

  function displayDecodedResult(result) {
    var canvas = document.getElementById('decoder-preview');
    canvas.width = result.canvas.width;
    canvas.height = result.canvas.height;
    canvas.getContext('2d').drawImage(result.canvas, 0, 0);

    document.getElementById('decoder-info').textContent =
      result.width + 'x' + result.height + ' | ' + result.format.toUpperCase();
    document.getElementById('decoder-decoded-container').style.display = 'block';
  }

  async function decodeBatchFiles(files) {
    var allEntries = [];
    var batchList = document.getElementById('decoder-batch-list');
    batchList.innerHTML = '';
    document.getElementById('decoder-batch-results').style.display = 'block';

    // First, extract all files (including from ZIPs)
    for (var f = 0; f < files.length; f++) {
      var file = files[f];
      var isZip = file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        try {
          var zipBuffer = await readFileAsArrayBuffer(file);
          var zipEntries = await extractZipEntries(zipBuffer);
          for (var z = 0; z < zipEntries.length; z++) {
            if (zipEntries[z].error) {
              allEntries.push({ name: zipEntries[z].name, error: zipEntries[z].error });
            } else {
              allEntries.push({ name: file.name + '/' + zipEntries[z].name, text: zipEntries[z].text });
            }
          }
        } catch (err) {
          allEntries.push({ name: file.name, error: 'ZIP error: ' + err.message });
        }
      } else {
        try {
          var text = await readFileAsText(file);
          allEntries.push({ name: file.name, text: text });
        } catch (err) {
          allEntries.push({ name: file.name, error: err.message });
        }
      }
    }

    document.getElementById('decoder-batch-info').textContent = '0 / ' + allEntries.length;
    batchDecodeResults = [];
    var totalStart = performance.now();

    for (var i = 0; i < allEntries.length; i++) {
      var entry = allEntries[i];

      if (entry.error) {
        var errItem = document.createElement('div');
        errItem.className = 'batch-item error';
        errItem.innerHTML = '<div class="batch-item-name">' + entry.name + '</div>' +
          '<div class="batch-item-error">' + entry.error + '</div>';
        batchList.appendChild(errItem);
      } else {
        try {
          var startTime = performance.now();
          var result = await decodeData(entry.text);
          result.elapsed = performance.now() - startTime;
          result.filename = entry.name.replace(/\.[^.]+$/, '') + '.png';

          batchDecodeResults.push(result);

          // Create thumbnail
          var thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 100;
          thumbCanvas.height = 75;
          var thumbCtx = thumbCanvas.getContext('2d');
          thumbCtx.drawImage(result.canvas, 0, 0, 100, 75);

          var item = document.createElement('div');
          item.className = 'batch-item';
          item.innerHTML = '<img class="batch-thumb" src="' + thumbCanvas.toDataURL() + '">' +
            '<div class="batch-item-name">' + entry.name + '</div>' +
            '<div class="batch-item-info">' + result.width + 'x' + result.height + ' | ' + result.format + '</div>' +
            '<div class="batch-item-timing">' + formatTime(result.elapsed) + '</div>';
          batchList.appendChild(item);
        } catch (err) {
          var errItem2 = document.createElement('div');
          errItem2.className = 'batch-item error';
          errItem2.innerHTML = '<div class="batch-item-name">' + entry.name + '</div>' +
            '<div class="batch-item-error">' + err.message + '</div>';
          batchList.appendChild(errItem2);
        }
      }

      document.getElementById('decoder-batch-info').textContent = (i + 1) + ' / ' + allEntries.length;
    }

    var totalElapsed = performance.now() - totalStart;
    var timingDiv = document.getElementById('decoder-batch-results').querySelector('.timing') || document.createElement('div');
    timingDiv.className = 'timing';
    timingDiv.innerHTML = '<strong>' + t('timing_batch') + ': ' + formatTime(totalElapsed) + '</strong>';
    if (!document.getElementById('decoder-batch-results').querySelector('.timing')) {
      document.getElementById('decoder-batch-results').appendChild(timingDiv);
    }

    showToast(t('toast_batch_done'), 'success');
  }

  function exportDecoded(format) {
    var canvas = document.getElementById('decoder-preview');
    var mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(function (blob) {
      downloadBlob(blob, 'decoded.' + format);
      showToast(t('toast_exported'), 'success');
    }, mimeType, 0.9);
  }

  // ============================================================
  // Modal (Password Prompt)
  // ============================================================
  function bindModal() {
    document.getElementById('decrypt-ok').addEventListener('click', function () {
      var pwd = document.getElementById('decrypt-password').value;
      document.getElementById('password-modal').style.display = 'none';
      if (pendingDecryptCallback) {
        pendingDecryptCallback(pwd);
        pendingDecryptCallback = null;
      }
    });

    document.getElementById('decrypt-cancel').addEventListener('click', function () {
      document.getElementById('password-modal').style.display = 'none';
      if (pendingDecryptCallback) {
        pendingDecryptCallback(null);
        pendingDecryptCallback = null;
      }
    });
  }

  function promptPassword() {
    return new Promise(function (resolve) {
      document.getElementById('decrypt-password').value = '';
      document.getElementById('decrypt-error').style.display = 'none';
      document.getElementById('password-modal').style.display = 'flex';
      pendingDecryptCallback = resolve;
    });
  }

  // ============================================================
  // ZIP Download
  // ============================================================
  function downloadZip(results, type) {
    if (!results || results.length === 0) { showToast(t('toast_nothing'), 'error'); return; }

    var files = results.map(function (r) {
      return { name: r.filename || 'output', data: r.data instanceof Uint8Array ? r.data : new Uint8Array(r.data) };
    });

    var zipData = createZip(files);
    downloadBlob(zipData, type + '-batch.zip');
    showToast(t('toast_exported'), 'success');
  }

  function createZip(files) {
    var entries = [];
    var parts = [];
    var offset = 0;

    for (var fi = 0; fi < files.length; fi++) {
      var file = files[fi];
      var nameBytes = new TextEncoder().encode(file.name);
      var data = file.data;
      var crc = crc32(data);

      var header = new Uint8Array(30 + nameBytes.length);
      var hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034B50, true);
      hv.setUint16(4, 20, true);
      hv.setUint32(14, crc, true);
      hv.setUint32(18, data.length, true);
      hv.setUint32(22, data.length, true);
      hv.setUint16(26, nameBytes.length, true);
      header.set(nameBytes, 30);

      entries.push({ name: nameBytes, crc: crc, size: data.length, offset: offset });
      parts.push(header, data);
      offset += header.length + data.length;
    }

    var centralParts = [];
    var centralSize = 0;
    for (var ei = 0; ei < entries.length; ei++) {
      var entry = entries[ei];
      var rec = new Uint8Array(46 + entry.name.length);
      var rv = new DataView(rec.buffer);
      rv.setUint32(0, 0x02014B50, true);
      rv.setUint16(4, 20, true);
      rv.setUint16(6, 20, true);
      rv.setUint32(16, entry.crc, true);
      rv.setUint32(20, entry.size, true);
      rv.setUint32(24, entry.size, true);
      rv.setUint16(28, entry.name.length, true);
      rv.setUint32(42, entry.offset, true);
      rec.set(entry.name, 46);
      centralParts.push(rec);
      centralSize += rec.length;
    }

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    var allParts = parts.concat(centralParts, [eocd]);
    var totalSize = 0;
    for (var pi = 0; pi < allParts.length; pi++) totalSize += allParts[pi].length;

    var result = new Uint8Array(totalSize);
    var pos = 0;
    for (var qi = 0; qi < allParts.length; qi++) {
      result.set(allParts[qi], pos);
      pos += allParts[qi].length;
    }
    return result;
  }

  function crc32(buf) {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    var crc = 0xFFFFFFFF;
    for (var k = 0; k < buf.length; k++) {
      crc = table[(crc ^ buf[k]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // ============================================================
  // ZIP Reading
  // ============================================================
  function readZipFile(zipData) {
    var files = [];
    var data = new Uint8Array(zipData);

    // Find end of central directory
    var eocdOffset = -1;
    for (var i = data.length - 22; i >= 0; i--) {
      if (data[i] === 0x50 && data[i+1] === 0x4B && data[i+2] === 0x05 && data[i+3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) throw new Error('Invalid ZIP file');

    var centralDirOffset = data[eocdOffset + 16] | (data[eocdOffset + 17] << 8) | (data[eocdOffset + 18] << 16) | (data[eocdOffset + 19] << 24);
    var numEntries = data[eocdOffset + 10] | (data[eocdOffset + 11] << 8);

    var pos = centralDirOffset;
    for (var e = 0; e < numEntries; e++) {
      var compression = data[pos + 10] | (data[pos + 11] << 8);
      var compSize = data[pos + 20] | (data[pos + 21] << 8) | (data[pos + 22] << 16) | (data[pos + 23] << 24);
      var uncompSize = data[pos + 24] | (data[pos + 25] << 8) | (data[pos + 26] << 16) | (data[pos + 27] << 24);
      var nameLen = data[pos + 28] | (data[pos + 29] << 8);
      var extraLen = data[pos + 30] | (data[pos + 31] << 8);
      var localOffset = data[pos + 42] | (data[pos + 43] << 8) | (data[pos + 44] << 16) | (data[pos + 45] << 24);
      var name = new TextDecoder().decode(data.slice(pos + 46, pos + 46 + nameLen));

      // Skip directories
      if (name.endsWith('/')) {
        pos += 46 + nameLen + extraLen + (data[pos + 32] | (data[pos + 33] << 8));
        continue;
      }

      // Read local file header to get data offset
      var localNameLen = data[localOffset + 26] | (data[localOffset + 27] << 8);
      var localExtraLen = data[localOffset + 28] | (data[localOffset + 29] << 8);
      var dataOffset = localOffset + 30 + localNameLen + localExtraLen;
      var fileData = data.slice(dataOffset, dataOffset + compSize);

      if (compression === 0) {
        // Store mode (no compression)
        files.push({ name: name, data: new Uint8Array(fileData) });
      } else if (compression === 8) {
        // Deflate - use DecompressionStream if available
        files.push({ name: name, data: new Uint8Array(fileData), compressed: true });
      }

      pos += 46 + nameLen + extraLen + (data[pos + 32] | (data[pos + 33] << 8));
    }

    return files;
  }

  async function decompressFile(file) {
    if (!file.compressed) return file.data;

    // Use DecompressionStream API if available
    if (typeof DecompressionStream !== 'undefined') {
      var ds = new DecompressionStream('deflate');
      var writer = ds.writable.getWriter();
      var reader = ds.readable.getReader();

      writer.write(file.data);
      writer.close();

      var chunks = [];
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        chunks.push(result.value);
      }

      var totalLength = chunks.reduce(function (acc, c) { return acc + c.length; }, 0);
      var output = new Uint8Array(totalLength);
      var offset = 0;
      for (var i = 0; i < chunks.length; i++) {
        output.set(chunks[i], offset);
        offset += chunks[i].length;
      }
      return output;
    }

    throw new Error('DecompressionStream not supported in this browser');
  }

  async function extractZipEntries(zipData) {
    var entries = readZipFile(zipData);
    var results = [];

    for (var i = 0; i < entries.length; i++) {
      try {
        var data = await decompressFile(entries[i]);
        var text = new TextDecoder().decode(data);
        results.push({ name: entries[i].name, text: text, data: data });
      } catch (err) {
        results.push({ name: entries[i].name, error: err.message });
      }
    }

    return results;
  }

  // ============================================================
  // Utilities
  // ============================================================
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  function formatTime(ms) {
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function downloadBlob(data, filename) {
    var blob = new Blob([data instanceof Uint8Array ? data : data]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
