import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: '__MSG_appName__',
    version: pkg.version,
    description: '__MSG_appDesc__',
    default_locale: 'zh_CN',
    action: {
      default_icon: '/assets/img/icon/icon.png',
      default_popup: '/dist/popup/index.html',
    },
    icons: {
      16: '/assets/img/icon/icon-16x16.png',
      48: '/assets/img/icon/icon-48x48.png',
      128: '/assets/img/icon/icon-128x128.png',
    },
    permissions: ['storage', 'favicon', 'tabs', 'scripting', 'sessions', 'tabGroups'],
    host_permissions: ['*://*/*'],
    optional_permissions: ['bookmarks', 'notifications'],
    chrome_url_overrides: {
      newtab: '/dist/newtab/index.html',
    },
    background: {
      service_worker: '/dist/background/index.mjs',
    },
    options_ui: {
      page: '/dist/options/index.html',
      open_in_tab: true,
    },
    // 一个扩展可以有很多命令，但只能指定 4 个建议的键。
    // commands: {},
    // content_scripts: [
    //   {
    //     matches: [
    //       '<all_urls>',
    //     ],
    //     js: [
    //       'dist/contentScripts/index.global.js',
    //     ],
    //   },
    // ],
    // web_accessible_resources: [
    //   {
    //     resources: ['dist/contentScripts/style.css'],
    //     matches: ['<all_urls>'],
    //   },
    // ],
    content_security_policy: {
      // this is required on dev for Vite script to load
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : `script-src 'self'; object-src 'self'`,
    },
  }

  if (process.env.BROWSER === 'firefox') {
    manifest.background = {
      scripts: ['/dist/background/index.mjs'],
    }
    manifest.browser_specific_settings = {
      gecko: {
        id: 'gxfgim@outlook.com',
        strict_min_version: '130.0',
      },
    }
  }
  return manifest
}
