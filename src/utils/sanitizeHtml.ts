const ALLOWED_TAGS = new Set([
  'b',
  'br',
  'em',
  'i',
  'mark',
  's',
  'span',
  'strong',
  'u',
]);

const DROP_WITH_CONTENT_TAGS = new Set([
  'base',
  'embed',
  'iframe',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'script',
  'style',
  'svg',
  'template',
]);

const SAFE_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

const sanitizeInlineStyle = (element: Element, rawStyle: string): string => {
  const tagName = element.tagName.toLowerCase();
  if (tagName !== 'mark' && tagName !== 'span') return '';

  const safeDeclarations: string[] = [];
  const seenProperties = new Set<string>();

  for (const declaration of rawStyle.split(';')) {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex === -1) continue;

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!property || !value || seenProperties.has(property)) continue;

    const isSafeColor = property === 'color' && SAFE_COLOR.test(value);
    const isSafeMarkBackground =
      tagName === 'mark' && property === 'background-color' && SAFE_COLOR.test(value);
    const isSafeMarkPadding =
      tagName === 'mark' && property === 'padding' && value === '1px 4px';
    const isSafeMarkRadius =
      tagName === 'mark' && property === 'border-radius' && value === '4px';

    if (isSafeColor || isSafeMarkBackground || isSafeMarkPadding || isSafeMarkRadius) {
      safeDeclarations.push(`${property}: ${value.toLowerCase()}`);
      seenProperties.add(property);
    }
  }

  return safeDeclarations.join('; ');
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] as string
  );

/**
 * Sanitiza a formatação rica aceita pelo editor de flashcards.
 *
 * A allowlist intencionalmente não aceita links, imagens, classes, IDs ou
 * atributos de evento. Os únicos estilos preservados são os gerados pela
 * barra de formatação do próprio editor.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';

  if (typeof DOMParser === 'undefined') {
    // Mantém o fallback seguro em ambientes sem DOM (SSR, scripts e testes).
    return escapeHtml(html);
  }

  const document = new DOMParser().parseFromString(html, 'text/html');

  const sanitizeChildren = (parent: Node): void => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
        element.remove();
        continue;
      }

      sanitizeChildren(element);

      if (!ALLOWED_TAGS.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        continue;
      }

      const safeStyle = sanitizeInlineStyle(element, element.getAttribute('style') || '');
      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      if (safeStyle) element.setAttribute('style', safeStyle);
    }
  };

  sanitizeChildren(document.body);
  return document.body.innerHTML;
};
