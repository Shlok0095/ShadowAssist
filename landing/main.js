;(function () {
  var c = window.SHADOWASSIST_SITE
  if (!c) return

  /** Avoid 404 when package version and release assets get out of sync */
  var API_LATEST = 'https://api.github.com/repos/Shlok0095/ShadowAssist/releases/latest'

  function setHref(id, url) {
    var el = document.getElementById(id)
    if (el && url) el.href = url
  }

  function pickAsset(assets, test) {
    if (!assets || !assets.length) return null
    for (var i = 0; i < assets.length; i++) {
      if (test(assets[i])) return assets[i]
    }
    return null
  }

  function bindSmartDownload(id, test) {
    var el = document.getElementById(id)
    if (!el) return
    el.addEventListener('click', function (e) {
      e.preventDefault()
      fetch(API_LATEST)
        .then(function (r) {
          if (!r.ok) throw new Error('release')
          return r.json()
        })
        .then(function (data) {
          var a = pickAsset(data.assets, test)
          if (a && a.browser_download_url) window.location.href = a.browser_download_url
          else window.location.href = c.releasesLatestUrl
        })
        .catch(function () {
          window.location.href = c.releasesLatestUrl
        })
    })
  }

  // No-JS / fallback: releases page (always valid)
  setHref('nav-download', c.releasesLatestUrl)
  setHref('cta-installer', c.releasesLatestUrl)
  setHref('cta-portable', c.releasesLatestUrl)
  setHref('nav-docs', c.howItWorksUrl)
  setHref('nav-repo', c.repoUrl)
  setHref('cta-releases', c.releasesLatestUrl)
  setHref('faq-privacy', c.privacyUrl)
  setHref('foot-terms', c.termsUrl)
  setHref('foot-privacy', c.privacyUrl)

  var home = document.getElementById('link-home')
  if (home) home.href = c.releasesLatestUrl

  bindSmartDownload('cta-installer', function (a) {
    return /^ShadowAssist-Setup-.+\.exe$/i.test(a.name)
  })
  bindSmartDownload('nav-download', function (a) {
    return /^ShadowAssist-Setup-.+\.exe$/i.test(a.name)
  })
  bindSmartDownload('cta-portable', function (a) {
    return a.name === 'ShadowAssist.exe'
  })
})()
