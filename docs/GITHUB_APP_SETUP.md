# GitHub App setup for Panupan33

Panupan33 already has a server-side GitHub App client at `src/lib/github-app.server.ts`.

## Render environment

Set these server-only variables:

- `GITHUB_APP_ID`: numeric GitHub App ID
- `GITHUB_APP_PRIVATE_KEY`: the complete PEM private key, stored as a secret
- `GITHUB_APP_INSTALLATION_ID`: optional numeric installation ID. If omitted, Panupan33 resolves the installation from the target repository.
- `GITHUB_TOKEN`: optional PAT fallback for legacy/global GitHub operations

The GitHub App path is the server-side authentication path. Never expose `GITHUB_APP_PRIVATE_KEY` to browser code or commit the key to Git.

## Required GitHub App permissions

For Boss to inspect and modify repositories, the App installation needs the repository permissions required by the operations it will perform, especially Contents. Actions permissions are needed for workflow inspection/dispatch where applicable.

## Flow

`GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY`
→ App JWT
→ installation ID
→ short-lived installation access token
→ GitHub repository API

Installation access tokens are temporary and should be generated when needed rather than persisted.

## Where to get the values

GitHub App settings are under GitHub account/organization settings → Developer settings → GitHub Apps → your App.

The App ID is shown on the App settings page. Generate the private key there and keep the downloaded PEM private.

For Panupan33, the preferred Render setup is App ID + private key + installation ID. The installation ID can be obtained from the App installation or resolved automatically from the repository.

## Safety

Do not put any of these values in `.env` files committed to GitHub, source code, client-side bundles, or chat messages. The private key is the sensitive credential.
