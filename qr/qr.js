(function () {
    'use strict';

    var MAX_BYTES = 2953;

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
    var downloadFormat = document.getElementById('qr-download-format');
    var preview = document.getElementById('qr-preview');
    var statusEl = document.getElementById('qr-status');
    var charCount = document.getElementById('char-count');
    var downloadBtn = document.getElementById('download-btn');
    var copyDataBtn = document.getElementById('copy-data-btn');

    if (typeof QRCodeStyling === 'undefined') {
        setStatus('Could not load QR library. Check your network connection.', 'error');
        downloadBtn.disabled = true;
        return;
    }

    var qrCode = new QRCodeStyling(buildOptions());
    qrCode.append(preview);

    function utf8ByteLength(str) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str).length;
        }
        return unescape(encodeURIComponent(str)).length;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
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

    function buildOptions() {
        var size = Number(sizeRange.value);
        var margin = Number(marginRange.value);
        var data = dataInput.value;

        return {
            width: size,
            height: size,
            type: 'canvas',
            data: data || ' ',
            margin: margin,
            qrOptions: {
                errorCorrectionLevel: errorCorrection.value
            },
            dotsOptions: {
                color: foreground.value,
                type: dotsStyle.value
            },
            cornersSquareOptions: {
                color: foreground.value,
                type: cornerSquareStyle.value
            },
            cornersDotOptions: {
                color: foreground.value,
                type: cornerDotStyle.value
            },
            backgroundOptions: {
                color: background.value
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

        var extension = downloadFormat.value === 'svg' ? 'svg' : 'png';
        downloadBtn.disabled = true;
        setStatus('Preparing download…', 'ok');

        try {
            await qrCode.download({
                name: 'qr-code',
                extension: extension
            });
            setStatus('Downloaded as ' + extension.toUpperCase() + '.', 'ok');
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

    [
        dataInput,
        errorCorrection,
        foreground,
        background,
        dotsStyle,
        cornerSquareStyle,
        cornerDotStyle
    ].forEach(function (el) {
        el.addEventListener('input', updateQr);
        el.addEventListener('change', updateQr);
    });

    downloadBtn.addEventListener('click', downloadQr);
    copyDataBtn.addEventListener('click', copyContent);

    validate();
})();
