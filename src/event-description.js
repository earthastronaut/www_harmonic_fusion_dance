// Shared event description rendering: markdown → HTML, then cleanup.
(function (global) {
    'use strict';

    let markedConfigured = false;

    function configureMarked() {
        if (markedConfigured) return;
        if (typeof marked === 'undefined' || typeof marked.use !== 'function') {
            return;
        }

        marked.use({
            gfm: true,
            breaks: true
        });
        markedConfigured = true;
    }

    function unescapeDescriptionText(text) {
        if (!text) return text;
        return text
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\!/g, '!')
            .replace(/\\&/g, '&')
            .replace(/\\[nN]/g, '\n')
            .replace(/\\\\/g, '\\');
    }

    /**
     * Google Calendar often stores line breaks as <br> (and wraps blocks in
     * <p>/<div>). Convert those to real newlines so markdown ATX headings
     * like "## Agenda" are recognized.
     */
    function normalizeForMarkdown(text) {
        if (!text) return text;

        let s = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // HTML line breaks → newlines
            .replace(/<\s*br\s*\/?\s*>/gi, '\n')
            // Paragraph / div boundaries → blank lines
            .replace(/<\/\s*p\s*>\s*<\s*p[^>]*>/gi, '\n\n')
            .replace(/<\/\s*div\s*>\s*<\s*div[^>]*>/gi, '\n\n')
            .replace(/<\/?\s*p[^>]*>/gi, '\n')
            .replace(/<\/?\s*div[^>]*>/gi, '\n')
            // Common Google Calendar wrapper
            .replace(/<\/?html-blob[^>]*>/gi, '')
            // Decode entities that commonly appear in calendar plain/HTML hybrids
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&');

        // Trim whitespace on each line; collapse 3+ blank lines
        s = s
            .split('\n')
            .map((line) => line.replace(/[ \t]+$/g, ''))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return s;
    }

    function markdownToHtml(text) {
        configureMarked();
        const source = normalizeForMarkdown(text);
        if (typeof marked === 'undefined' || typeof marked.parse !== 'function') {
            return source
                .split(/\n{2,}/)
                .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
                .join('');
        }
        return marked.parse(source);
    }

    function cleanDescriptionHTML(html) {
        if (!html) return html;

        let tempDiv;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
            } else {
                tempDiv = doc.body;
                if (!tempDiv || tempDiv.children.length === 0) {
                    tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                }
            }
        } catch (e) {
            tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
        }

        const commentWalker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        const comments = [];
        let node;
        while ((node = commentWalker.nextNode())) {
            comments.push(node);
        }
        comments.forEach((comment) => comment.remove());

        const textNodeWalker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        const textNodes = [];
        let textNode;
        while ((textNode = textNodeWalker.nextNode())) {
            textNodes.push(textNode);
        }

        textNodes.forEach((textNodeItem) => {
            let text = textNodeItem.textContent;
            const originalText = text;
            text = text
                .replace(/\\,/g, ',')
                .replace(/\\;/g, ';')
                .replace(/\\!/g, '!')
                .replace(/\\&/g, '&')
                .replace(/\\n/g, ' ')
                .replace(/\\N/g, ' ')
                .replace(/\\\\/g, '\\')
                .replace(/Â/g, '')
                .replace(/\s+([,\.!?;:])/g, '$1')
                .replace(/\s{2,}/g, ' ');
            if (text !== originalText) {
                textNodeItem.textContent = text;
            }
        });

        tempDiv.querySelectorAll('p').forEach((p) => p.classList.add('description-paragraph'));
        tempDiv.querySelectorAll('a').forEach((a) => a.classList.add('description-link'));
        tempDiv.querySelectorAll('b, strong').forEach((b) => b.classList.add('description-bold'));
        tempDiv.querySelectorAll('ul, ol').forEach((list) => list.classList.add('description-list'));
        tempDiv.querySelectorAll('li').forEach((li) => li.classList.add('description-list-item'));
        tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            heading.classList.add('description-heading');
        });

        return tempDiv.innerHTML
            .replace(/<p[^>]*>\s*<\/p>/g, '')
            .replace(/<!--[^>]*-->/g, '')
            .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>');
    }

    /**
     * Render an event description for display.
     * Attempts markdown → HTML (# → h1 by default).
     * Existing HTML in the source is preserved by the markdown parser.
     */
    function renderEventDescription(raw) {
        if (!raw) return raw;

        const text = unescapeDescriptionText(raw);
        return cleanDescriptionHTML(markdownToHtml(text));
    }

    global.renderEventDescription = renderEventDescription;
    global.cleanDescriptionHTML = cleanDescriptionHTML;
})(typeof window !== 'undefined' ? window : globalThis);
