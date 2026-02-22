// Agent hierarchy for server-side status lookups
const AGENT_HIERARCHY = {
  ceo:          { id: 'ceo',          name: 'DANO',         isHuman: true },
  clawd:        { id: 'clawd',        name: 'Clawd',        model: 'claude-sonnet-4-6' },
  soren:        { id: 'soren',        name: 'Soren',        model: 'gpt-4o' },
  mason:        { id: 'mason',        name: 'Mason',        model: 'gpt-5.2-codex' },
  sentinel:     { id: 'sentinel',     name: 'Sentinel',     model: 'gpt-4o' },
  kyle:         { id: 'kyle',         name: 'Kyle',         model: 'claude-sonnet-4-6' },
  scout:        { id: 'scout',        name: 'Scout',        model: 'claude-sonnet-4' },
  cartographer: { id: 'cartographer', name: 'Cartographer', model: 'claude-sonnet-4' },
  coder:        { id: 'coder',        name: 'Coder',        model: 'gpt-5.2-codex' },
  wirer:        { id: 'wirer',        name: 'Wirer',        model: 'gpt-5.2-codex' },
  scribe:       { id: 'scribe',       name: 'Scribe',       model: 'claude-sonnet-4' },
  probe:        { id: 'probe',        name: 'Probe',        model: 'gpt-5.2-codex' },
  auditor:      { id: 'auditor',      name: 'Auditor',      model: 'openai/o3' },
  atlas:        { id: 'atlas',        name: 'Atlas',        model: 'claude-sonnet-4' },
  adsspecialist:{ id: 'adsspecialist',name: 'AdsSpecialist',model: 'claude-sonnet-4' },
  vanguard:     { id: 'vanguard',     name: 'Vanguard',     model: 'claude-sonnet-4' },
  postwatch:    { id: 'postwatch',    name: 'Postwatch',    model: 'claude-sonnet-4' },
  curator:      { id: 'curator',      name: 'Curator',      model: 'claude-sonnet-4' },
};

module.exports = { AGENT_HIERARCHY };
