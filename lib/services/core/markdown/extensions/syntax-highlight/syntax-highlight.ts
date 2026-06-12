import {Extension, MarkdownToken} from '@changerawr/markdown';
import {createHighlighterCoreSync} from 'shiki/core';
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript';
import githubLight from 'shiki/themes/github-light.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import bash from 'shiki/langs/bash.mjs';
import c from 'shiki/langs/c.mjs';
import clojure from 'shiki/langs/clojure.mjs';
import coffee from 'shiki/langs/coffee.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import crystal from 'shiki/langs/crystal.mjs';
import csharp from 'shiki/langs/csharp.mjs';
import css from 'shiki/langs/css.mjs';
import dart from 'shiki/langs/dart.mjs';
import diff from 'shiki/langs/diff.mjs';
import dockerfile from 'shiki/langs/dockerfile.mjs';
import elixir from 'shiki/langs/elixir.mjs';
import erlang from 'shiki/langs/erlang.mjs';
import fsharp from 'shiki/langs/fsharp.mjs';
import go from 'shiki/langs/go.mjs';
import graphql from 'shiki/langs/graphql.mjs';
import groovy from 'shiki/langs/groovy.mjs';
import handlebars from 'shiki/langs/handlebars.mjs';
import haskell from 'shiki/langs/haskell.mjs';
import html from 'shiki/langs/html.mjs';
import ini from 'shiki/langs/ini.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import json5 from 'shiki/langs/json5.mjs';
import jsonc from 'shiki/langs/jsonc.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import kotlin from 'shiki/langs/kotlin.mjs';
import latex from 'shiki/langs/latex.mjs';
import less from 'shiki/langs/less.mjs';
import lua from 'shiki/langs/lua.mjs';
import makefile from 'shiki/langs/makefile.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import nginx from 'shiki/langs/nginx.mjs';
import nix from 'shiki/langs/nix.mjs';
import objectiveC from 'shiki/langs/objective-c.mjs';
import objectiveCpp from 'shiki/langs/objective-cpp.mjs';
import perl from 'shiki/langs/perl.mjs';
import php from 'shiki/langs/php.mjs';
import powershell from 'shiki/langs/powershell.mjs';
import properties from 'shiki/langs/properties.mjs';
import proto from 'shiki/langs/proto.mjs';
import python from 'shiki/langs/python.mjs';
import r from 'shiki/langs/r.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import rust from 'shiki/langs/rust.mjs';
import scala from 'shiki/langs/scala.mjs';
import scss from 'shiki/langs/scss.mjs';
import solidity from 'shiki/langs/solidity.mjs';
import sql from 'shiki/langs/sql.mjs';
import svelte from 'shiki/langs/svelte.mjs';
import swift from 'shiki/langs/swift.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import vb from 'shiki/langs/vb.mjs';
import vue from 'shiki/langs/vue.mjs';
import xml from 'shiki/langs/xml.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import zig from 'shiki/langs/zig.mjs';

/**
 * Language aliases - map common language names to Shiki's bundled grammar identifiers
 */
const languageAliases: Record<string, string> = {
    'html': 'html',
    'xml': 'xml',
    'svg': 'xml',
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'shell': 'bash',
    'shellscript': 'bash',
    'zsh': 'bash',
    'yml': 'yaml',
    'cs': 'csharp',
    'rb': 'ruby',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'rs': 'rust',
    'docker': 'dockerfile',
    'ps1': 'powershell',
    'ps': 'powershell',
    'objc': 'objective-c',
    'objcpp': 'objective-cpp',
    'objective-c++': 'objective-cpp',
    'mm': 'objective-cpp',
    'fs': 'fsharp',
    'f#': 'fsharp',
    'vb.net': 'vb',
    'make': 'makefile',
    'plaintext': 'text',
    'txt': 'text',
    'hbs': 'handlebars',
    'tex': 'latex',
    'gql': 'graphql',
    'pl': 'perl',
};

const highlighter = createHighlighterCoreSync({
    themes: [githubLight, githubDark],
    langs: [
        bash, c, clojure, coffee, cpp, crystal, csharp, css, dart, diff,
        dockerfile, elixir, erlang, fsharp, go, graphql, groovy, handlebars,
        haskell, html, ini, java, javascript, json, json5, jsonc, jsx,
        kotlin, latex, less, lua, makefile, markdown, nginx, nix,
        objectiveC, objectiveCpp, perl, php, powershell, properties, proto,
        python, r, ruby, rust, scala, scss, solidity, sql, svelte, swift,
        toml, tsx, typescript, vb, vue, xml, yaml, zig,
    ],
    engine: createJavaScriptRegexEngine(),
});

const supportedLanguages = new Set(highlighter.getLoadedLanguages());

/**
 * Syntax Highlighting Extension for Changerawr Markdown
 *
 * Uses Shiki (TextMate grammars, VS Code-quality highlighting) with
 * dual light/dark themes baked into the rendered HTML via CSS variables.
 *
 * Examples:
 * ```javascript
 * const hello = 'world';
 * ```
 *
 * ```python
 * def hello():
 *     print("world")
 * ```
 */
const syntaxHighlightExtension: Extension = {
    name: 'syntax-highlight',

    parseRules: [
        {
            name: 'code_block',
            // Block-level code fence pattern: ```language\ncode\n```
            // Must be at start of line, captures language and code content
            pattern: /^```(\w+)?\n([\s\S]*?)```$/m,
            render: (match): MarkdownToken => {
                const language = match[1] || 'text';
                const code = match[2] || '';

                return {
                    type: 'code_block',
                    content: code,
                    raw: match[0],
                    attributes: {
                        language,
                    },
                };
            }
        }
    ],

    renderRules: [
        {
            type: 'code_block',
            render: (token): string => {
                const code = token.content;
                let language = (token.attributes?.language || 'text').toLowerCase();
                language = languageAliases[language] || language;

                if (!supportedLanguages.has(language)) {
                    language = 'text';
                }

                const highlightedHtml = highlighter.codeToHtml(code, {
                    lang: language,
                    themes: {
                        light: 'github-light',
                        dark: 'github-dark',
                    },
                    defaultColor: false,
                });

                return `<div class="code-block-wrapper my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
  <div class="code-block-header flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <span class="text-xs font-mono uppercase tracking-wide text-gray-500 dark:text-gray-400">${language}</span>
    <span data-copy-button></span>
  </div>
  ${highlightedHtml}
</div>`;
            }
        }
    ]
};

export {syntaxHighlightExtension};
