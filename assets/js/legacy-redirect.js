// Preserve bookmarked sections after separating the academic profile and service.
(function () {
  const legacyPage = document.querySelector('.legacy-page-redirect');
  if (!legacyPage) return;

  const profile = legacyPage.dataset.profileUrl;
  const service = legacyPage.dataset.serviceUrl;
  const routes = {
    '-education': profile + '#education',
    'education': profile + '#education',
    '-academic-positions': profile + '#academic-positions',
    'academic-positions': profile + '#academic-positions',
    '-honors--awards': profile + '#honors-awards',
    'honors-awards': profile + '#honors-awards',
    '-professional-service--outreach': service + '#professional-service',
    'professional-service': service + '#professional-service',
    'editorial-service': service + '#editorial-service',
    'conference-organization': service + '#conference-organization',
    'workshop-chair': service + '#workshop-chair',
    'special-session-chair': service + '#special-session-chair',
    'technical-program-committees': service + '#technical-program-committees',
    'journal-reviewing': service + '#journal-reviewing',
    'invited-talks': service + '#invited-talks',
    'tutorials': service + '#tutorials'
  };
  let section = '';
  try {
    section = decodeURIComponent(window.location.hash.slice(1));
  } catch (error) {
    // An invalid fragment still reaches the default destination.
  }
  const fallback = legacyPage.dataset.source === 'honors'
    ? profile + '#honors-awards' : profile;
  const route = Object.prototype.hasOwnProperty.call(routes, section)
    ? routes[section] : fallback;
  const destination = new URL(route, window.location.origin);
  destination.search = window.location.search;
  window.location.replace(destination.href);
}());
