;(function () {
  var c = window.SHADOWASSIST_SITE
  if (!c) return

  function setHref(id, url) {
    var el = document.getElementById(id)
    if (el && url) el.href = url
  }

  setHref('nav-download', c.downloadPortableUrl)
  setHref('nav-docs', c.howItWorksUrl)
  setHref('nav-repo', c.repoUrl)
  setHref('cta-portable', c.downloadPortableUrl)
  setHref('cta-installer', c.downloadInstallerUrl)
  setHref('cta-releases', c.releasesLatestUrl)
  setHref('faq-privacy', c.privacyUrl)
  setHref('foot-terms', c.termsUrl)
  setHref('foot-privacy', c.privacyUrl)

  var home = document.getElementById('link-home')
  if (home) home.href = c.releasesLatestUrl
})()
