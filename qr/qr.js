(function () {
    'use strict';

    var MAX_BYTES = 2953;
    var SVG_NS = 'http://www.w3.org/2000/svg';

    var DEFAULTS = {
        size: 300,
        margin: 10,
        ec: 'Q',
        fg: '#000000',
        bg: '#ffffff',
        dots: 'square',
        cornerSquare: 'square',
        cornerDot: 'square',
        radius: 0,
        logoWidth: 0,
        logoHeight: 0,
        format: 'png'
    };

    var PARAM_KEYS = {
        size: 'size',
        margin: 'margin',
        ec: 'ec',
        fg: 'fg',
        bg: 'bg',
        dots: 'dots',
        cornerSquare: 'cs',
        cornerDot: 'cd',
        radius: 'radius',
        logoWidth: 'logoW',
        logoHeight: 'logoH',
        format: 'format'
    };

    var DOT_STYLES = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'];
    var CORNER_SQUARE_STYLES = ['square', 'dot', 'rounded', 'extra-rounded', 'dots', 'classy', 'classy-rounded'];
    var CORNER_DOT_STYLES = ['square', 'dot', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'];
    var EC_LEVELS = ['L', 'M', 'Q', 'H'];
    var FORMATS = ['png', 'svg'];

    var dataInput = document.getElementById('qr-data');
    var sizeRange = document.getElementById('qr-size');
    var sizeNumber = document.getElementById('qr-size-number');
    var marginRange = document.getElementById('qr-margin');
    var marginNumber = document.getElementById('qr-margin-number');
    var errorCorrection = document.getElementById('qr-error-correction');
    var foreground = document.getElementById('qr-foreground');
    var background = document.getElementById('qr-background');
    var dotsStyle = document.getElementById('qr-dots-style');
    var cornerSquareStyle = document.getElementById('qr-corner-square-style');
    var cornerDotStyle = document.getElementById('qr-corner-dot-style');
    var radiusRange = document.getElementById('qr-radius');
    var radiusNumber = document.getElementById('qr-radius-number');
    var logoWidthRange = document.getElementById('qr-logo-width');
    var logoWidthNumber = document.getElementById('qr-logo-width-number');
    var logoHeightRange = document.getElementById('qr-logo-height');
    var logoHeightNumber = document.getElementById('qr-logo-height-number');
    var downloadFormat = document.getElementById('qr-download-format');
    var preview = document.getElementById('qr-preview');
    var statusEl = document.getElementById('qr-status');
    var charCount = document.getElementById('char-count');
    var downloadBtn = document.getElementById('download-btn');
    var copyDataBtn = document.getElementById('copy-data-btn');

    var syncingUrl = false;
    var qrCode = null;

    if (typeof QRCodeStyling === 'undefined') {
        setStatus('Could not load QR library. Check your network connection.', 'error');
        downloadBtn.disabled = true;
        return;
    }

    applySettingsFromUrl();
    updateDependentLimits();
    qrCode = new QRCodeStyling(buildOptions());
    qrCode.applyExtension(visualExtension);
    qrCode.append(preview);
    syncUrlFromControls();
    validate();

    function utf8ByteLength(str) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str).length;
        }
        return unescape(encodeURIComponent(str)).length;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeColor(value, fallback) {
        if (typeof value !== 'string') {
            return fallback;
        }

        var hex = value.trim().toLowerCase();
        if (/^#[0-9a-f]{6}$/.test(hex)) {
            return hex;
        }
        if (/^#[0-9a-f]{3}$/.test(hex)) {
            return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        return fallback;
    }

    function parseIntParam(raw, fallback, min, max, step) {
        if (raw === null || raw === undefined || String(raw).trim() === '') {
            return fallback;
        }

        var value = Number(raw);
        if (!Number.isFinite(value)) {
            return fallback;
        }
        value = Math.round(value / step) * step;
        return clamp(value, min, max);
    }

    function oneOf(value, allowed, fallback) {
        return allowed.indexOf(value) === -1 ? fallback : value;
    }

    function getSettings() {
        return {
            size: Number(sizeRange.value),
            margin: Number(marginRange.value),
            ec: errorCorrection.value,
            fg: normalizeColor(foreground.value, DEFAULTS.fg),
            bg: normalizeColor(background.value, DEFAULTS.bg),
            dots: dotsStyle.value,
            cornerSquare: cornerSquareStyle.value,
            cornerDot: cornerDotStyle.value,
            radius: Number(radiusRange.value),
            logoWidth: Number(logoWidthRange.value),
            logoHeight: Number(logoHeightRange.value),
            format: downloadFormat.value
        };
    }

    function setPairValue(rangeEl, numberEl, value) {
        rangeEl.value = String(value);
        numberEl.value = String(value);
    }

    function applySettings(settings) {
        setPairValue(sizeRange, sizeNumber, settings.size);
        setPairValue(marginRange, marginNumber, settings.margin);
        errorCorrection.value = settings.ec;
        foreground.value = settings.fg;
        background.value = settings.bg;
        dotsStyle.value = settings.dots;
        cornerSquareStyle.value = settings.cornerSquare;
        cornerDotStyle.value = settings.cornerDot;
        setPairValue(radiusRange, radiusNumber, settings.radius);
        setPairValue(logoWidthRange, logoWidthNumber, settings.logoWidth);
        setPairValue(logoHeightRange, logoHeightNumber, settings.logoHeight);
        downloadFormat.value = settings.format;
        updateDependentLimits();
    }

    function maxLogoDimension(size, margin) {
        return Math.max(0, size - margin * 2);
    }

    function updateDependentLimits() {
        var size = Number(sizeRange.value);
        var margin = Number(marginRange.value);
        var maxRadius = Math.floor(size / 2);
        var maxLogo = maxLogoDimension(size, margin);

        radiusRange.max = String(maxRadius);
        radiusNumber.max = String(maxRadius);
        if (Number(radiusRange.value) > maxRadius) {
            setPairValue(radiusRange, radiusNumber, maxRadius);
        }

        logoWidthRange.max = String(maxLogo);
        logoWidthNumber.max = String(maxLogo);
        logoHeightRange.max = String(maxLogo);
        logoHeightNumber.max = String(maxLogo);

        if (Number(logoWidthRange.value) > maxLogo) {
            setPairValue(logoWidthRange, logoWidthNumber, maxLogo);
        }
        if (Number(logoHeightRange.value) > maxLogo) {
            setPairValue(logoHeightRange, logoHeightNumber, maxLogo);
        }
    }

    function applySettingsFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var settings = {
            size: parseIntParam(params.get(PARAM_KEYS.size), DEFAULTS.size, 128, 1024, 1),
            margin: parseIntParam(params.get(PARAM_KEYS.margin), DEFAULTS.margin, 0, 80, 1),
            ec: oneOf((params.get(PARAM_KEYS.ec) || DEFAULTS.ec).toUpperCase(), EC_LEVELS, DEFAULTS.ec),
            fg: normalizeColor(params.get(PARAM_KEYS.fg), DEFAULTS.fg),
            bg: normalizeColor(params.get(PARAM_KEYS.bg), DEFAULTS.bg),
            dots: oneOf(params.get(PARAM_KEYS.dots) || DEFAULTS.dots, DOT_STYLES, DEFAULTS.dots),
            cornerSquare: oneOf(params.get(PARAM_KEYS.cornerSquare) || DEFAULTS.cornerSquare, CORNER_SQUARE_STYLES, DEFAULTS.cornerSquare),
            cornerDot: oneOf(params.get(PARAM_KEYS.cornerDot) || DEFAULTS.cornerDot, CORNER_DOT_STYLES, DEFAULTS.cornerDot),
            radius: DEFAULTS.radius,
            logoWidth: DEFAULTS.logoWidth,
            logoHeight: DEFAULTS.logoHeight,
            format: oneOf((params.get(PARAM_KEYS.format) || DEFAULTS.format).toLowerCase(), FORMATS, DEFAULTS.format)
        };

        var maxRadius = Math.floor(settings.size / 2);
        var maxLogo = maxLogoDimension(settings.size, settings.margin);
        settings.radius = parseIntParam(params.get(PARAM_KEYS.radius), DEFAULTS.radius, 0, maxRadius, 1);
        settings.logoWidth = parseIntParam(params.get(PARAM_KEYS.logoWidth), DEFAULTS.logoWidth, 0, maxLogo, 1);
        settings.logoHeight = parseIntParam(params.get(PARAM_KEYS.logoHeight), DEFAULTS.logoHeight, 0, maxLogo, 1);

        applySettings(settings);
    }

    function syncUrlFromControls() {
        if (syncingUrl) {
            return;
        }

        var settings = getSettings();
        var params = new URLSearchParams();

        Object.keys(PARAM_KEYS).forEach(function (key) {
            var value = settings[key];
            var defaultValue = DEFAULTS[key];
            if (String(value).toLowerCase() !== String(defaultValue).toLowerCase()) {
                params.set(PARAM_KEYS[key], String(value));
            }
        });

        var query = params.toString();
        var nextUrl = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
        var currentUrl = window.location.pathname + window.location.search + window.location.hash;

        if (nextUrl !== currentUrl) {
            syncingUrl = true;
            history.replaceState(null, '', nextUrl);
            syncingUrl = false;
        }
    }

    function syncPair(rangeEl, numberEl) {
        function fromRange() {
            numberEl.value = rangeEl.value;
            updateQr();
        }

        function fromNumber() {
            var min = Number(numberEl.min);
            var max = Number(numberEl.max);
            var step = Number(numberEl.step) || 1;
            var value = Number(numberEl.value);

            if (Number.isNaN(value)) {
                numberEl.value = rangeEl.value;
                return;
            }

            value = clamp(value, min, max);
            value = Math.round(value / step) * step;
            numberEl.value = String(value);
            rangeEl.value = String(value);
            updateQr();
        }

        rangeEl.addEventListener('input', fromRange);
        numberEl.addEventListener('input', fromNumber);
        numberEl.addEventListener('change', fromNumber);
    }

    function visualExtension(svg, options) {
        var width = options.width || 0;
        var height = options.height || 0;
        var radius = Number(radiusRange.value) || 0;
        var logoWidth = Number(logoWidthRange.value) || 0;
        var logoHeight = Number(logoHeightRange.value) || 0;
        var bgColor = (options.backgroundOptions && options.backgroundOptions.color) || background.value;

        var oldDefs = svg.querySelector('#qr-visual-defs');
        if (oldDefs) {
            oldDefs.remove();
        }
        var oldLogo = svg.querySelector('#qr-logo-space');
        if (oldLogo) {
            oldLogo.remove();
        }

        var existingGroup = svg.querySelector('#qr-visual-group');
        if (existingGroup) {
            while (existingGroup.firstChild) {
                svg.insertBefore(existingGroup.firstChild, existingGroup);
            }
            existingGroup.remove();
        }

        svg.removeAttribute('clip-path');

        if (radius > 0) {
            var clippedRadius = clamp(radius, 0, Math.floor(Math.min(width, height) / 2));
            var defs = document.createElementNS(SVG_NS, 'defs');
            defs.setAttribute('id', 'qr-visual-defs');

            var clipPath = document.createElementNS(SVG_NS, 'clipPath');
            clipPath.setAttribute('id', 'qr-rounded-clip');

            var clipRect = document.createElementNS(SVG_NS, 'rect');
            clipRect.setAttribute('x', '0');
            clipRect.setAttribute('y', '0');
            clipRect.setAttribute('width', String(width));
            clipRect.setAttribute('height', String(height));
            clipRect.setAttribute('rx', String(clippedRadius));
            clipRect.setAttribute('ry', String(clippedRadius));
            clipPath.appendChild(clipRect);
            defs.appendChild(clipPath);
            svg.insertBefore(defs, svg.firstChild);

            var group = document.createElementNS(SVG_NS, 'g');
            group.setAttribute('id', 'qr-visual-group');
            group.setAttribute('clip-path', 'url(#qr-rounded-clip)');

            Array.prototype.slice.call(svg.childNodes).forEach(function (node) {
                if (node === defs) {
                    return;
                }
                group.appendChild(node);
            });
            svg.appendChild(group);
        }

        if (logoWidth > 0 && logoHeight > 0) {
            var maxLogo = maxLogoDimension(width, options.margin || 0);
            var safeWidth = clamp(logoWidth, 0, maxLogo);
            var safeHeight = clamp(logoHeight, 0, maxLogo);
            var x = (width - safeWidth) / 2;
            var y = (height - safeHeight) / 2;

            var logoRect = document.createElementNS(SVG_NS, 'rect');
            logoRect.setAttribute('id', 'qr-logo-space');
            logoRect.setAttribute('x', String(x));
            logoRect.setAttribute('y', String(y));
            logoRect.setAttribute('width', String(safeWidth));
            logoRect.setAttribute('height', String(safeHeight));
            logoRect.setAttribute('fill', bgColor);

            var clipGroup = svg.querySelector('#qr-visual-group');
            if (clipGroup) {
                clipGroup.appendChild(logoRect);
            } else {
                svg.appendChild(logoRect);
            }
        }
    }

    function triggerBlobDownload(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function svgBlobToPngBlob(svgBlob, size) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(svgBlob);
            var image = new Image();

            image.onload = function () {
                try {
                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    var context = canvas.getContext('2d');
                    if (!context) {
                        throw new Error('Canvas unavailable');
                    }
                    context.clearRect(0, 0, size, size);
                    context.drawImage(image, 0, 0, size, size);
                    canvas.toBlob(function (pngBlob) {
                        URL.revokeObjectURL(url);
                        if (!pngBlob) {
                            reject(new Error('PNG conversion failed'));
                            return;
                        }
                        resolve(pngBlob);
                    }, 'image/png');
                } catch (err) {
                    URL.revokeObjectURL(url);
                    reject(err);
                }
            };

            image.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Could not render SVG for PNG export'));
            };

            image.src = url;
        });
    }

    function buildOptions() {
        var settings = getSettings();
        var data = dataInput.value;

        return {
            width: settings.size,
            height: settings.size,
            type: 'svg',
            data: data || ' ',
            margin: settings.margin,
            qrOptions: {
                errorCorrectionLevel: settings.ec
            },
            dotsOptions: {
                color: settings.fg,
                type: settings.dots
            },
            cornersSquareOptions: {
                color: settings.fg,
                type: settings.cornerSquare
            },
            cornersDotOptions: {
                color: settings.fg,
                type: settings.cornerDot
            },
            backgroundOptions: {
                color: settings.bg
            }
        };
    }

    function setStatus(message, tone) {
        statusEl.textContent = message;
        statusEl.dataset.tone = tone || 'ok';
    }

    function validate() {
        var data = dataInput.value;
        var bytes = utf8ByteLength(data);
        var chars = data.length;

        charCount.textContent = chars + (chars === 1 ? ' character' : ' characters') +
            ' · ' + bytes + (bytes === 1 ? ' byte' : ' bytes');

        if (!data.trim()) {
            setStatus('Enter content to generate a QR code.', 'error');
            downloadBtn.disabled = true;
            return false;
        }

        if (bytes > MAX_BYTES) {
            setStatus('Content is too large for a QR code (max ' + MAX_BYTES + ' bytes).', 'error');
            downloadBtn.disabled = true;
            return false;
        }

        setStatus('Live preview updated.', 'ok');
        downloadBtn.disabled = false;
        return true;
    }

    function updateQr() {
        updateDependentLimits();
        syncUrlFromControls();

        var valid = validate();
        try {
            qrCode.update(buildOptions());
            if (valid) {
                setStatus('Live preview updated.', 'ok');
            }
        } catch (err) {
            console.error(err);
            setStatus('Could not generate QR code with the current settings.', 'error');
            downloadBtn.disabled = true;
        }
    }

    async function downloadQr() {
        if (!validate()) {
            return;
        }

        var format = downloadFormat.value === 'svg' ? 'svg' : 'png';
        var size = Number(sizeRange.value);
        downloadBtn.disabled = true;
        setStatus('Preparing download…', 'ok');

        try {
            var svgBlob = await qrCode.getRawData('svg');
            if (!svgBlob) {
                throw new Error('Empty SVG');
            }

            if (format === 'svg') {
                triggerBlobDownload(svgBlob, 'qr-code.svg');
            } else {
                var pngBlob = await svgBlobToPngBlob(svgBlob, size);
                triggerBlobDownload(pngBlob, 'qr-code.png');
            }

            setStatus('Downloaded as ' + format.toUpperCase() + '.', 'ok');
        } catch (err) {
            console.error(err);
            setStatus('Download failed. Try again.', 'error');
        } finally {
            downloadBtn.disabled = !validate();
        }
    }

    async function copyContent() {
        var data = dataInput.value;
        if (!data) {
            setStatus('Nothing to copy.', 'error');
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(data);
            } else {
                dataInput.focus();
                dataInput.select();
                document.execCommand('copy');
            }
            setStatus('Content copied to clipboard.', 'ok');
        } catch (err) {
            console.error(err);
            setStatus('Could not copy content.', 'error');
        }
    }

    syncPair(sizeRange, sizeNumber);
    syncPair(marginRange, marginNumber);
    syncPair(radiusRange, radiusNumber);
    syncPair(logoWidthRange, logoWidthNumber);
    syncPair(logoHeightRange, logoHeightNumber);

    [
        dataInput,
        errorCorrection,
        foreground,
        background,
        dotsStyle,
        cornerSquareStyle,
        cornerDotStyle,
        downloadFormat
    ].forEach(function (el) {
        el.addEventListener('input', updateQr);
        el.addEventListener('change', updateQr);
    });

    downloadBtn.addEventListener('click', downloadQr);
    copyDataBtn.addEventListener('click', copyContent);

    window.addEventListener('popstate', function () {
        applySettingsFromUrl();
        updateQr();
    });
})();
