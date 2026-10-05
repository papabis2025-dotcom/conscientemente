import assert from 'node:assert/strict';
import test from 'node:test';
import { DOMParser, Node as LinkedomNode } from 'linkedom';
import { sanitizeHtml } from '../src/utils/sanitizeHtml.ts';

class BrowserLikeDOMParser {
  parseFromString(html: string, mimeType: DOMParserSupportedType) {
    return new DOMParser().parseFromString(
      `<!doctype html><html><body>${html}</body></html>`,
      mimeType
    );
  }
}

Object.defineProperties(globalThis, {
  DOMParser: { configurable: true, value: BrowserLikeDOMParser },
  Node: { configurable: true, value: LinkedomNode },
});

test('remove scripts, elementos ativos e atributos de evento', () => {
  const result = sanitizeHtml(
    '<img src="x" onerror="alert(1)"><script>alert(2)</script>' +
    '<b onclick="alert(3)" id="unsafe">conteúdo seguro</b>' +
    '<svg><script>alert(4)</script></svg>'
  );

  assert.equal(result, '<b>conteúdo seguro</b>');
  assert.equal(/script|onerror|onclick|<img|<svg/i.test(result), false);
});

test('preserva somente a formatação e os estilos gerados pelo editor', () => {
  const result = sanitizeHtml(
    '<mark style="background-color:#fef08a;color:#000;padding:1px 4px;' +
    'border-radius:4px;position:fixed;background-image:url(javascript:alert(1))">A</mark>' +
    '<span style="color:#3b82f6" data-secret="x">B</span>'
  );

  assert.match(result, /^<mark style="[^"]+">A<\/mark><span style="color: #3b82f6">B<\/span>$/);
  assert.equal(/position|background-image|javascript|data-secret/i.test(result), false);
});

test('remove links e mantém filhos seguros sem alterar novamente o resultado', () => {
  const once = sanitizeHtml('<a href="javascript:alert(1)"><i>texto</i></a>');
  assert.equal(once, '<i>texto</i>');
  assert.equal(sanitizeHtml(once), once);
});
