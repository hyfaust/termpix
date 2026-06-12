/**
 * i18n.js — Internationalization (Chinese/English)
 */

'use strict';

var I18N = {
  zh: {
    subtitle: '终端图片查看器 & iTerm2/Sixel 协议编解码工具',
    tab_encoder: '编码器',
    tab_decoder: '解码器',
    // Encoder
    encoder_title: '图片编码',
    encoder_source: '图片来源：',
    encoder_paste: '粘贴剪贴板',
    encoder_url_placeholder: '或输入图片 URL...',
    encoder_load: '加载',
    encoder_drop: '拖拽图片到此处（支持多文件）',
    encoder_preview: '原始图片',
    encoder_settings: '编码设置',
    encoder_format: '输出格式：',
    encoder_width: '最大宽度（像素）：',
    encoder_height: '最大高度（像素）：',
    encoder_bg: '背景色：',
    encoder_noresize: '不压缩分辨率',
    encoder_colors: '颜色数：',
    encoder_quantize: '量化算法：',
    encoder_dither: '抖动模式：',
    dither_none: '无',
    encoder_encrypt: '加密 (AES-256-GCM)',
    password_placeholder: '输入密码',
    encoder_encode: '编码',
    encoder_batch: '批量编码',
    encoder_copy: '复制输出',
    encoder_export: '导出文件',
    encoder_output: '编码输出',
    // Decoder
    decoder_title: '序列解码',
    decoder_input_label: '序列数据：',
    decoder_placeholder: '粘贴 iTerm2 或 Sixel 序列到此处...',
    decoder_or_file: '或从文件加载（支持多文件）',
    decoder_format: '格式检测：',
    format_auto: '自动检测',
    decoder_decode: '解码',
    decoder_batch: '批量解码',
    decoder_decoded_title: '解码图片',
    decoder_download_png: '下载 PNG',
    decoder_download_jpeg: '下载 JPEG',
    // Common
    download_zip: '下载 ZIP',
    // Modal
    modal_decrypt_msg: '此文件已加密，请输入密码',
    modal_password_placeholder: '输入解密密码',
    modal_ok: '确定',
    modal_cancel: '取消',
    // Timing
    timing_encode: '编码耗时',
    timing_decode: '解码耗时',
    timing_batch: '总耗时',
    // Footer
    footer: '基于 <a href="https://github.com/hzeller/timg" target="_blank">timg</a>、<a href="https://github.com/atanunq/viu" target="_blank">viu</a> 和 <a href="https://github.com/PLACEHOLDER/sixel-web" target="_blank">sixel-web</a> 算法',
    // Toast
    toast_copied: '已复制到剪贴板',
    toast_exported: '已导出文件',
    toast_password_generated: '已生成随机密码并复制',
    toast_nothing: '没有可操作的内容',
    toast_load_image: '请先上传图片',
    toast_paste_required: '请粘贴序列数据',
    toast_decode_done: '解码完成',
    toast_batch_done: '批量处理完成',
    toast_decrypted: '解密成功',
    toast_decrypt_failed: '解密失败，密码错误',
    info_size: '大小',
    info_dimensions: '尺寸',
    bytes: '字节'
  },
  en: {
    subtitle: 'Terminal Image Viewer & iTerm2/Sixel Protocol Encoder/Decoder',
    tab_encoder: 'Encoder',
    tab_decoder: 'Decoder',
    // Encoder
    encoder_title: 'Image Encoder',
    encoder_source: 'Image Source:',
    encoder_paste: 'Paste from Clipboard',
    encoder_url_placeholder: 'Or enter image URL...',
    encoder_load: 'Load',
    encoder_drop: 'Drag & drop images here (multi-file supported)',
    encoder_preview: 'Original Image',
    encoder_settings: 'Encode Settings',
    encoder_format: 'Output Format:',
    encoder_width: 'Max Width (px):',
    encoder_height: 'Max Height (px):',
    encoder_bg: 'Background:',
    encoder_noresize: 'Keep Original Resolution',
    encoder_colors: 'Colors:',
    encoder_quantize: 'Quantize:',
    encoder_dither: 'Dither:',
    dither_none: 'None',
    encoder_encrypt: 'Encrypt (AES-256-GCM)',
    password_placeholder: 'Enter password',
    encoder_encode: 'Encode',
    encoder_batch: 'Batch Encode',
    encoder_copy: 'Copy Output',
    encoder_export: 'Export File',
    encoder_output: 'Encode Output',
    // Decoder
    decoder_title: 'Sequence Decoder',
    decoder_input_label: 'Sequence Data:',
    decoder_placeholder: 'Paste iTerm2 or Sixel sequence here...',
    decoder_or_file: 'Or load from file (multi-file supported)',
    decoder_format: 'Format Detection:',
    format_auto: 'Auto Detect',
    decoder_decode: 'Decode',
    decoder_batch: 'Batch Decode',
    decoder_decoded_title: 'Decoded Image',
    decoder_download_png: 'Download PNG',
    decoder_download_jpeg: 'Download JPEG',
    // Common
    download_zip: 'Download ZIP',
    // Modal
    modal_decrypt_msg: 'This file is encrypted. Enter password:',
    modal_password_placeholder: 'Enter decryption password',
    modal_ok: 'OK',
    modal_cancel: 'Cancel',
    // Timing
    timing_encode: 'Encode Time',
    timing_decode: 'Decode Time',
    timing_batch: 'Total Time',
    // Footer
    footer: 'Based on <a href="https://github.com/hzeller/timg" target="_blank">timg</a>, <a href="https://github.com/atanunq/viu" target="_blank">viu</a> and <a href="https://github.com/PLACEHOLDER/sixel-web" target="_blank">sixel-web</a>',
    // Toast
    toast_copied: 'Copied to clipboard',
    toast_exported: 'File exported',
    toast_password_generated: 'Random password generated & copied',
    toast_nothing: 'Nothing to operate on',
    toast_load_image: 'Please upload images first',
    toast_paste_required: 'Please paste sequence data',
    toast_decode_done: 'Decode complete',
    toast_batch_done: 'Batch processing complete',
    toast_decrypted: 'Decrypted successfully',
    toast_decrypt_failed: 'Decryption failed, wrong password',
    info_size: 'Size',
    info_dimensions: 'Dimensions',
    bytes: 'bytes'
  }
};

var currentLang = localStorage.getItem('lang') || 'zh';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || key;
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var text = t(key);
    if (el.tagName === 'OPTION') {
      el.textContent = text;
    } else if (text.indexOf('<a ') >= 0) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.getElementById('lang-label').textContent = currentLang === 'zh' ? 'EN' : '中';
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

function switchLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lang', currentLang);
  applyLanguage();
}
