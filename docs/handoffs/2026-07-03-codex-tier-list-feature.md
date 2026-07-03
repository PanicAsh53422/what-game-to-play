# Handoff: WGT-FEATURE-001 Tier List Feature

## What changed

- Added a third app mode: `Tier List`.
- Added a Steam-library tier list page where users can:
  - load a personal Steam library using the existing API key / Steam ID flow;
  - use numeric Steam friend codes in the same Steam ID field;
  - drag games into customizable tiers;
  - quick-rank unranked games with tier buttons;
  - filter the ranking pool by genre, tag, or category;
  - select a custom subset of games and rank only selected games;
  - rename tiers;
  - change tier colors;
  - add, delete, and reorder tiers;
  - reset to default `A`, `B`, `C`, `D`, `F` tiers;
  - clear rankings;
  - persist rankings locally by Steam app id.
- Added collaborative tier-list rooms over Socket.IO:
  - create a shared room after loading a library;
  - join by room code;
  - sync loaded games, tiers, tier edits, and ranked games live;
  - show connected collaborators.
- Added localStorage persistence for tier definitions and ranked game ids.

## Files changed

- `src/App.tsx`
- `src/App.css`
- `src/components/ModeToggle.tsx`
- `src/components/TierListPage.tsx`
- `src/services/tierListSession.ts`
- `src/services/steam.ts`
- `src/services/tierListStorage.ts`
- `src/types/discovery.ts`
- `server/index.ts`
- `.pipeline/work-orders.md`

## What was verified

- `npm run build` passed.
- `curl http://localhost:3002/socket.io/?EIO=4&transport=polling` returned a Socket.IO handshake response.

## What was not verified

- Live Steam API loading was not verified with real credentials.
- Browser drag/drop behavior was not manually smoke-tested in this handoff.
- A Node-based Socket.IO create/join smoke test failed with `xhr poll error` in this execution environment despite the HTTP handshake endpoint responding.
- No automated tests exist for this app yet.

## Known risks

- Steam friend-code conversion assumes numeric friend codes map to account IDs using the SteamID64 public offset.
- Rankings are local to the browser and are not synced across devices.
- Collaborative rooms are in-memory only. They disappear when the local server restarts or the last collaborator leaves.
- Large libraries may render many unranked cards at once; virtualization may be useful later.

## Required owner decision

- Confirm whether collaborative tier lists should remain temporary local rooms or eventually support persistent share/export/import links.
